import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });
  }

  async onModuleInit() {
    // Prisma will lazily connect on first query. On serverless cold starts the
    // socket negotiation against the database can spike, so an eager
    // `$connect()` is a common source of init timeouts. We let it connect on
    // demand and only log the error when it eventually fails — that way the
    // function returns a real HTTP error instead of hanging.
    (this as unknown as { $on: (e: string, cb: (event: unknown) => void) => void }).$on(
      'error',
      (event) => this.logger.error(event),
    );
    (this as unknown as { $on: (e: string, cb: (event: unknown) => void) => void }).$on(
      'warn',
      (event) => this.logger.warn(event),
    );
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
