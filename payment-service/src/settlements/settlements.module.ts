import { Module } from '@nestjs/common';
import { SettlementsController } from './settlements.controller';
import { SettlementsService } from './settlements.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Module({
  controllers: [SettlementsController],
  providers: [SettlementsService, ApiKeyGuard],
})
export class SettlementsModule {}
