import { IsEnum, IsNotEmpty } from 'class-validator';
import { TransactionStatus } from '@prisma/client';

export class UpdateTransactionStatusDto {
  @IsEnum(TransactionStatus)
  @IsNotEmpty()
  status!: TransactionStatus;
}
