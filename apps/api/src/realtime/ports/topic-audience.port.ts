import type { Observable } from 'rxjs';

export interface TopicAudienceChange {
  topic: string;
  /** true when the first subscriber arrived, false when the last one left. */
  watched: boolean;
}

/**
 * Lets a module follow demand without the channel knowing what it is counting
 * (ADR 0020) — it reports a string, and the module that owns that string decides
 * what to open or close.
 */
export abstract class TopicAudience {
  abstract changes(): Observable<TopicAudienceChange>;
}
