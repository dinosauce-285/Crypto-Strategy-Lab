import { createHash } from 'node:crypto';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { UnrecoverableError, type Job } from 'bullmq';
import { canonicalJson, type BacktestJob } from '@csl/contracts';
import { ExperimentRepository } from './experiment.repository';
import type { JobOutcome } from './job-outcome';
import { BacktestRunner, UnknownDatasetError } from './ports/backtest-runner.port';
import { RunEvaluator } from './ports/run-evaluator.port';
import { StrategyFactory, UnknownStrategyError } from './ports/strategy-factory.port';
import { InvalidSpecError, validateSpec } from './spec-validator';
import { specHash as hashSpec } from './spec-hash';

export class MissingPortError extends Error {
  constructor(port: string, task: string) {
    super(`no ${port} is registered — ${task} supplies it`);
  }
}

const hashValue = (value: string): string => createHash('sha256').update(value).digest('hex');

/**
 * Nothing improves on a second attempt for these, so they end the job on the first one.
 * ADR 0007 names getting this wrong as the cost of a specification crossing a queue.
 */
const isPermanent = (error: unknown): boolean =>
  error instanceof InvalidSpecError ||
  error instanceof UnknownStrategyError ||
  error instanceof UnknownDatasetError ||
  error instanceof MissingPortError;

@Injectable()
export class BacktestProcessor {
  private readonly logger = new Logger(BacktestProcessor.name);

  constructor(
    private readonly experiments: ExperimentRepository,
    @Optional() private readonly factory?: StrategyFactory,
    @Optional() private readonly runner?: BacktestRunner,
    @Optional() private readonly evaluator?: RunEvaluator,
  ) {}

  async process(job: Job<BacktestJob, JobOutcome>): Promise<JobOutcome> {
    const startedAt = Date.now();
    const { spec: raw, datasetId } = job.data ?? { spec: undefined, datasetId: '' };
    let specHash: string | undefined;
    try {
      const spec = validateSpec(raw);
      specHash = hashSpec(spec);
      const identity = specHash;
      const done = (status: JobOutcome['status'], rest: Partial<JobOutcome> = {}): JobOutcome => ({
        status,
        specHash: identity,
        datasetId,
        durationMs: Date.now() - startedAt,
        ...rest,
      });

      if (await this.experiments.isRecorded(datasetId, specHash)) return done('duplicate');

      const strategy = await this.require(this.factory, 'StrategyFactory', 'T11').build(spec);
      const trades = await this.require(this.runner, 'BacktestRunner', 'T12').run(strategy, datasetId);
      const metrics = await this.require(this.evaluator, 'RunEvaluator', 'T13').score(trades, datasetId);

      const experimentId = await this.experiments.recordCompleted({
        datasetId,
        spec,
        specHash,
        metrics,
        trades,
      });
      return experimentId ? done('completed', { experimentId, metrics }) : done('duplicate');
    } catch (error) {
      return this.fail(job, { raw, datasetId, specHash }, error);
    }
  }

  /**
   * A failure that is final — permanently broken, or out of attempts — is written down
   * before it is thrown, so the count of section 32.7 comes from the same table as the
   * results. A failure with attempts left is thrown untouched and comes back.
   */
  private async fail(
    job: Job<BacktestJob, JobOutcome>,
    candidate: { raw: unknown; datasetId: string; specHash?: string },
    error: unknown,
  ): Promise<never> {
    const reason = error instanceof Error ? error.message : String(error);
    const permanent = isPermanent(error);
    const lastAttempt = job.attemptsStarted >= (job.opts.attempts ?? 1);

    if (!permanent && !lastAttempt) throw error;

    const recorded = await this.experiments.recordFailed({
      datasetId: candidate.datasetId,
      spec: candidate.raw,
      /** A specification that never validated is identified by what arrived instead. */
      specHash: candidate.specHash ?? hashValue(canonicalJson(candidate.raw)),
      error: reason,
    });
    if (!recorded) this.logger.warn(`failure not attributable to a dataset: ${reason}`);
    throw permanent ? new UnrecoverableError(reason) : error;
  }

  private require<T>(port: T | undefined, name: string, task: string): T {
    if (!port) throw new MissingPortError(name, task);
    return port;
  }
}
