import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(dto: GenerateSettlementDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: dto.merchant_id },
    });

    if (!merchant) {
      throw new NotFoundException(`Merchant con id '${dto.merchant_id}' no existe`);
    }

    const periodStart = new Date(dto.period_start);
    const periodEnd = new Date(dto.period_end);

    const eligibleTransactions = await this.prisma.transaction.findMany({
      where: {
        merchant_id: dto.merchant_id,
        status: 'approved',
        created_at: {
          gte: periodStart,
          lte: periodEnd,
        },
        settlement_transaction: null,
      },
    });

    if (eligibleTransactions.length === 0) {
      throw new NotFoundException(
        'No hay transacciones aprobadas sin liquidar en el rango de fechas indicado',
      );
    }

    const totalAmount = eligibleTransactions.reduce(
      (acc, tx) => acc.add(new Decimal(tx.amount.toString())),
      new Decimal(0),
    );

    const settlement = await this.prisma.$transaction(async (tx) => {
      const newSettlement = await tx.settlement.create({
        data: {
          merchant_id: dto.merchant_id,
          total_amount: totalAmount,
          transaction_count: eligibleTransactions.length,
          period_start: periodStart,
          period_end: periodEnd,
        },
      });

      await tx.settlementTransaction.createMany({
        data: eligibleTransactions.map((t) => ({
          settlement_id: newSettlement.id,
          transaction_id: t.id,
        })),
      });

      return newSettlement;
    });

    return settlement;
  }

  async findOne(id: string) {
    const settlement = await this.prisma.settlement.findUnique({
      where: { id },
      include: {
        merchant: true,
        settlement_transactions: {
          include: { transaction: true },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundException(`Liquidacion con id '${id}' no encontrada`);
    }

    return settlement;
  }
}
