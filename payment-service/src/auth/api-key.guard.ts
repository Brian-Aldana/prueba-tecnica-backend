import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key requerida');
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { api_key: apiKey },
    });

    if (!merchant) {
      throw new UnauthorizedException('API key invalida');
    }

    if (merchant.status === 'inactive') {
      throw new ForbiddenException('Merchant inactivo');
    }

    request.merchant = merchant;
    return true;
  }
}
