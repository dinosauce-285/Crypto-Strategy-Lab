import type { StrategyParams } from './strategy';

/**
 * Members are combined by weighted score, and only by weighted score. Vote counting
 * would discard the strength a signal carries, which is the thing that makes the
 * combination weighted rather than a tally.
 *
 * This stays a field rather than a constant so a second rule can be added without
 * reshaping anything that already reads a specification.
 */
export const MERGE_RULES = ['weighted'] as const;
export type MergeRule = (typeof MERGE_RULES)[number];

/**
 * `version` and `paramsHash` are carried by value so an old experiment identifies
 * the code and the numbers it ran without depending on a table that can still change.
 *
 * `weight` is part of what makes this candidate itself: two members at 0.5 each and
 * the same two at 0.8 and 0.2 are different candidates and are scored separately.
 */
export interface CandidateMember {
  id: string;
  version: number;
  params: StrategyParams;
  paramsHash: string;
  /**
   * Strictly above 0, a multiple of 0.1, and the members of a specification sum to 1.
   *
   * Normalised because the decision threshold has to mean the same thing whatever
   * the member count — unnormalised, five members agreeing outscores two members
   * agreeing and the leaderboard tilts towards crowded candidates for no reason.
   * Above zero because a member weighted 0 is a smaller candidate wearing a
   * disguise. On a grid because continuous weights give every draw its own hash,
   * which leaves nothing for duplicate detection to catch.
   */
  weight: number;
}

/**
 * A candidate as it travels: generated here, pushed through the queue, stored on an
 * experiment. The runnable object is built from this inside the worker and thrown
 * away, because behaviour lives on a prototype and does not survive serialisation.
 *
 * The dataset is deliberately absent — this answers what the strategy is, a dataset
 * answers what it ran on. They are sent together and stored in separate columns, so
 * one candidate on two timeframes stays one candidate.
 */
export interface CandidateSpec {
  rule: MergeRule;
  /**
   * How much net agreement is needed before the composite acts. Scores inside
   * `[-threshold, threshold]` are indecision and produce HOLD; the comparison is
   * strict, so landing exactly on it holds.
   *
   * Above 0 and below 1, a multiple of 0.1. It sits here rather than as a constant
   * in the composite so two thresholds can be two candidates on one leaderboard —
   * nobody can argue this number, but the board can answer it.
   */
  threshold: number;
  members: CandidateMember[];
}

/** A candidate and the data it is to run against. What crosses the queue. */
export interface BacktestJob {
  spec: CandidateSpec;
  datasetId: string;
}
