import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, ApiKeyGuard],
})
export class TransactionsModule {}
