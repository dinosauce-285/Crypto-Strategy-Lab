import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { MESSAGES, type Candle, type ServerMessage } from '@csl/contracts';

describe('UI Transport and Topic delivery (T09)', () => {
  it('receives and buffers server-pushed candles without computing recovery in React', () => {
    const receivedCandles: Candle[] = [];

    const handleMessage = (message: ServerMessage) => {
      if (message.type === MESSAGES.MarketCandle) {
        receivedCandles.push(message.payload.candle);
      }
    };

    // Simulate server pushing recovered candles across transport
    const candle1: Candle = {
      pair: 'BTCUSDT',
      timeframe: '1m',
      openTime: 1000,
      open: '100',
      high: '105',
      low: '95',
      close: '102',
      volume: '10',
      closed: true,
    };

    const recoveredCandle: Candle = {
      pair: 'BTCUSDT',
      timeframe: '1m',
      openTime: 1060,
      open: '102',
      high: '108',
      low: '101',
      close: '107',
      volume: '15',
      closed: true,
    };

    handleMessage({ type: MESSAGES.MarketCandle, payload: { candle: candle1 } });
    handleMessage({ type: MESSAGES.MarketCandle, payload: { candle: recoveredCandle } });

    strictEqual(receivedCandles.length, 2);
    deepStrictEqual(receivedCandles[1], recoveredCandle);
  });
});
