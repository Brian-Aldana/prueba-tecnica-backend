import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { GenerateSettlementDto } from './dto/generate-settlement.dto';
import { ApiKeyGuard } from '../auth/api-key.guard';

@UseGuards(ApiKeyGuard)
@Controller('settlements')
export class SettlementsController {
  constructor(private readonly service: SettlementsService) {}

  @Post('generate')
  generate(@Body() dto: GenerateSettlementDto) {
    return this.service.generate(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }
}
