import { IoAdapter } from '@nestjs/platform-socket.io';
import type { INestApplicationContext } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';

/**
 * `app.enableCors` covers HTTP and does not reach the socket server, and the gateway
 * decorator is evaluated before configuration is loaded — so the origin arrives here.
 */
export class ChannelIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly origin: string,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions): unknown {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.origin },
    });
  }
}
