import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { TransactionStatus } from '@prisma/client';
import { EventsService } from '../events/events.service';

const VALID_TRANSITIONS: Partial<Record<TransactionStatus, TransactionStatus[]>> = {
  pending: ['approved', 'rejected', 'failed'],
  approved: ['completed', 'failed'],
};

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsService,
  ) {}

  private async generateReference(): Promise<string> {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    for (let attempt = 0; attempt < 5; attempt++) {
      const random = Array.from({ length: 6 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length)),
      ).join('');

      const ref = `TXN-${date}-${random}`;
      const existing = await this.prisma.transaction.findUnique({ where: { reference: ref } });

      if (!existing) return ref;
    }

    throw new Error('No se pudo generar referencia unica');
  }

  async create(dto: CreateTransactionDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchant_id },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant con id '${dto.merchant_id}' no existe`);
    }

    const reference = await this.generateReference();

    return this.prisma.transaction.create({
      data: {
        merchant_id: dto.merchant_id,
        amount: dto.amount,
        currency: dto.currency,
        type: dto.type,
        reference,
        metadata: dto.metadata ? JSON.parse(JSON.stringify(dto.metadata)) : undefined,
      },
    });
  }

  async findAll(query: ListTransactionsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.date_from || query.date_to) {
      where.created_at = {
        ...(query.date_from && { gte: new Date(query.date_from) }),
        ...(query.date_to && { lte: new Date(query.date_to) }),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { merchant: true },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaccion con id '${id}' no encontrada`);
    }

    return transaction;
  }

  async updateStatus(id: string, dto: UpdateTransactionStatusDto) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });

    if (!transaction) {
      throw new NotFoundException(`Transaccion con id '${id}' no encontrada`);
    }

    const allowed = VALID_TRANSITIONS[transaction.status];

    if (!allowed || !allowed.includes(dto.status)) {
      throw new UnprocessableEntityException(
        `Transicion de estado invalida: no se puede cambiar de '${transaction.status}' a '${dto.status}'`,
      );
    }

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.events.publishTransactionStatusChanged({
      transaction_id: updated.id,
      merchant_id: updated.merchant_id,
      event_type: `transaction.${dto.status}`,
      payload: {
        previous_status: transaction.status,
        new_status: dto.status,
        reference: updated.reference,
        amount: updated.amount,
        currency: updated.currency,
      },
    });

    return updated;
  }
}
