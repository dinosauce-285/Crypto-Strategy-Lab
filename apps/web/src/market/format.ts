const TIME = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const TIME_SHORT = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DATE = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * Formats the decimal string as it arrived — grouped and with trailing zeros dropped,
 * never parsed into a number, so nothing is lost on the way to the screen.
 * Separators follow vi-VN convention: "." groups thousands, "," marks the fraction.
 */
export function decimal(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return trimmed ? `${grouped},${trimmed}` : grouped;
}

export const clock = (at: number): string => TIME.format(new Date(at));
export const shortClock = (at: number): string => TIME_SHORT.format(new Date(at));
export const date = (at: number): string => DATE.format(new Date(at));

export function sideLabel(side: 'BUY' | 'SELL' | 'buy' | 'sell'): string {
  return side.toUpperCase() === 'BUY' ? 'Mua' : 'Bán';
}
