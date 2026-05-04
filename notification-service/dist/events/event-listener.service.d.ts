import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export declare class EventListenerService implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    private readonly logger;
    private subscriber;
    constructor(prisma: PrismaService);
    onModuleInit(): void;
    onModuleDestroy(): Promise<void>;
    private handleMessage;
    private processWithRetry;
}
