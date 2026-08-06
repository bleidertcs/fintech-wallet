import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return 'User Service NestJS';
  }

  @Get('/health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
