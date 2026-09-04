/**
 * An error a caller can provoke, carrying the status it deserves — ADR 0044.
 * A fault that is ours stays an ordinary Error and is answered with a 500.
 *
 * The message is rendered to the person using the app, unedited. Every caller of this API
 * is the Vietnamese web client, so write it in Vietnamese and keep it to one short line:
 * what happened, plus the way out only when the screen does not already show one. An id
 * the reader cannot act on belongs on a field, not in the sentence.
 */
export abstract class DomainError extends Error {
  abstract readonly status: number;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
