import { io, type Socket } from 'socket.io-client';
import { CHANNEL } from '@csl/contracts';

let socket: Socket | undefined;

/**
 * One socket for the whole app: the four charts of T08 are four subscriptions on this
 * connection, not four connections. Same origin, so it goes through the dev proxy.
 */
export function channel(): Socket {
  socket ??= io({ path: CHANNEL.path });
  return socket;
}
