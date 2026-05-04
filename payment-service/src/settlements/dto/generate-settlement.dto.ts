import { IsISO8601, IsNotEmpty, IsUUID } from 'class-validator';

export class GenerateSettlementDto {
  @IsUUID()
  @IsNotEmpty()
  merchant_id!: string;

  @IsISO8601()
  @IsNotEmpty()
  period_start!: string;

  @IsISO8601()
  @IsNotEmpty()
  period_end!: string;
}
