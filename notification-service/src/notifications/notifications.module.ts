import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EventListenerService } from '../events/event-listener.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EventListenerService],
})
export class NotificationsModule {}
