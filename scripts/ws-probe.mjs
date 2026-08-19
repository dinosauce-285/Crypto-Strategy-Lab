// Watch one topic on the push channel from a terminal.
//
//   node scripts/ws-probe.mjs market:BTCUSDT:price
//   node scripts/ws-probe.mjs leaderboard:abc http://localhost:3001
//
// The frame is Socket.IO's, not plain WebSocket, so curl cannot read this channel —
// that is the cost ADR 0019 accepts, and this script is the answer to it.
import { createRequire } from 'node:module';
import { io } from 'socket.io-client';

// The package's ESM build emits extension-less relative imports, which a bundler
// resolves and plain Node does not — so this reads the CJS build instead.
const { CHANNEL } = createRequire(import.meta.url)('@csl/contracts');

const [topic, url = 'http://localhost:3001'] = process.argv.slice(2);

if (!topic) {
  console.error('usage: node scripts/ws-probe.mjs <topic> [url]');
  process.exit(1);
}

const socket = io(url, { path: CHANNEL.path, transports: ['websocket'] });

socket.on('connect', () => {
  console.log(`[probe] connected to ${url}${CHANNEL.path} as ${socket.id}`);
  socket.emit(CHANNEL.subscribe, topic);
  console.log(`[probe] subscribed to ${topic}`);
});

socket.on(topic, (message) => {
  console.log(`[${new Date().toISOString()}] ${JSON.stringify(message)}`);
});

socket.on('disconnect', (reason) => console.log(`[probe] disconnected: ${reason}`));
socket.on('connect_error', (error) => console.error(`[probe] ${error.message}`));

process.on('SIGINT', () => {
  socket.emit(CHANNEL.unsubscribe, topic);
  socket.close();
  process.exit(0);
});
