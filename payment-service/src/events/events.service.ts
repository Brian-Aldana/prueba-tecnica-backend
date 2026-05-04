import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export interface TransactionStatusChangedEvent {
  transaction_id: string;
  merchant_id: string;
  event_type: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private publisher: Redis;

  onModuleInit() {
    this.publisher = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      lazyConnect: true,
    });

    this.publisher.on('error', (err) => {
      this.logger.warn(`Redis publisher error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    await this.publisher.quit();
  }

  async publishTransactionStatusChanged(event: TransactionStatusChangedEvent): Promise<void> {
    try {
      await this.publisher.publish(
        'transaction.status_changed',
        JSON.stringify(event),
      );
    } catch (err) {
      this.logger.error(`Error publicando evento: ${(err as Error).message}`);
    }
  }
}
