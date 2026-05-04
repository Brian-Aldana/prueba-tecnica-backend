import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Currency, TransactionType } from '@prisma/client';

export class CreateTransactionDto {
  @IsUUID()
  @IsNotEmpty()
  merchant_id!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Type(() => Number)
  amount!: number;

  @IsEnum(Currency)
  currency!: Currency;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
