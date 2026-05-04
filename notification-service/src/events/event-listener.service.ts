import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

interface TransactionEvent {
  transaction_id: string;
  merchant_id: string;
  event_type: string;
  payload: Record<string, unknown>;
}

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;

@Injectable()
export class EventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventListenerService.name);
  private subscriber: Redis;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.subscriber = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      lazyConnect: true,
    });

    this.subscriber.on('error', (err) => {
      this.logger.warn(`Redis subscriber error: ${err.message}`);
    });

    this.subscriber.subscribe('transaction.status_changed', (err) => {
      if (err) {
        this.logger.error(`Error suscribiendo al canal: ${err.message}`);
      }
    });

    this.subscriber.on('message', (_channel: string, message: string) => {
      this.handleMessage(message).catch((err) => {
        this.logger.error(`Error procesando mensaje: ${err.message}`);
      });
    });
  }

  async onModuleDestroy() {
    await this.subscriber.quit();
  }

  private async handleMessage(raw: string): Promise<void> {
    let event: TransactionEvent;

    try {
      event = JSON.parse(raw) as TransactionEvent;
    } catch {
      this.logger.warn(`Mensaje no parseable: ${raw}`);
      return;
    }

    const notification = await this.prisma.notification.create({
      data: {
        transaction_id: event.transaction_id,
        merchant_id: event.merchant_id,
        event_type: event.event_type,
        payload: event.payload,
        status: 'pending',
      },
    });

    await this.processWithRetry(notification.id);
  }

  private async processWithRetry(notificationId: string): Promise<void> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.prisma.notification.update({
          where: { id: notificationId },
          data: { attempts: attempt, status: 'sent' },
        });
        this.logger.log(`Notificacion ${notificationId} procesada en intento ${attempt}`);
        return;
      } catch {
        this.logger.warn(`Intento ${attempt} fallido para notificacion ${notificationId}`);

        if (attempt < MAX_ATTEMPTS) {
          const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          await this.prisma.notification.update({
            where: { id: notificationId },
            data: { attempts: attempt, status: 'failed' },
          });
        }
      }
    }
  }
}
