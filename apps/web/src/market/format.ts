const TIME = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * Formats the decimal string as it arrived — grouped and with trailing zeros dropped,
 * never parsed into a number, so nothing is lost on the way to the screen.
 */
export function decimal(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

export const clock = (at: number): string => TIME.format(new Date(at));

/** DD/MM/YYYY, regardless of the browser's own locale. */
export const date = (at: number): string => DATE.format(new Date(at));
