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

export function tradeTime(at: number): string {
  const d = new Date(at);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}

export function sideLabel(side: 'BUY' | 'SELL' | 'buy' | 'sell'): string {
  return side.toUpperCase() === 'BUY' ? 'Mua' : 'Bán';
}
