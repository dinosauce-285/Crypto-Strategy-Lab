/**
 * An error a caller can provoke, carrying the status it deserves — ADR 0044.
 * A fault that is ours stays an ordinary Error and is answered with a 500.
 */
export abstract class DomainError extends Error {
  abstract readonly status: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
