"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EventListenerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventListenerService = void 0;
const common_1 = require("@nestjs/common");
const ioredis_1 = require("ioredis");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000;
let EventListenerService = EventListenerService_1 = class EventListenerService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(EventListenerService_1.name);
    }
    onModuleInit() {
        this.subscriber = new ioredis_1.default({
            host: process.env.REDIS_HOST ?? 'localhost',
            port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
            lazyConnect: true,
        });
        this.subscriber.on('error', (err) => {
            this.logger.warn(`Redis subscriber error: ${err.message}`);
        });
        this.subscriber.subscribe('transaction.status_changed', (err) => {
            if (err) {
                this.logger.error(`Error suscribiendo al canal: ${err.message}`);
            }
        });
        this.subscriber.on('message', (_channel, message) => {
            this.handleMessage(message).catch((err) => {
                this.logger.error(`Error procesando mensaje: ${err.message}`);
            });
        });
    }
    async onModuleDestroy() {
        await this.subscriber.quit();
    }
    async handleMessage(raw) {
        let event;
        try {
            event = JSON.parse(raw);
        }
        catch {
            this.logger.warn(`Mensaje no parseable: ${raw}`);
            return;
        }
        const notification = await this.prisma.notification.create({
            data: {
                transaction_id: event.transaction_id,
                merchant_id: event.merchant_id,
                event_type: event.event_type,
                payload: event.payload,
                status: 'pending',
            },
        });
        await this.processWithRetry(notification.id);
    }
    async processWithRetry(notificationId) {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            try {
                await this.prisma.notification.update({
                    where: { id: notificationId },
                    data: { attempts: attempt, status: 'sent' },
                });
                this.logger.log(`Notificacion ${notificationId} procesada en intento ${attempt}`);
                return;
            }
            catch {
                this.logger.warn(`Intento ${attempt} fallido para notificacion ${notificationId}`);
                if (attempt < MAX_ATTEMPTS) {
                    const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
                else {
                    await this.prisma.notification.update({
                        where: { id: notificationId },
                        data: { attempts: attempt, status: 'failed' },
                    });
                }
            }
        }
    }
};
exports.EventListenerService = EventListenerService;
exports.EventListenerService = EventListenerService = EventListenerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventListenerService);
//# sourceMappingURL=event-listener.service.js.map