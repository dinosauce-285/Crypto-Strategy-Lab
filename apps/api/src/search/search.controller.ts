import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Post } from '@nestjs/common';
import type { RunStatus } from '@csl/contracts';
import { parseStartRun } from './dto/start-run.dto';
import { isBounded } from './run-bounds';
import { NoActiveRunError, RunAlreadyActiveError, SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Post('runs')
  async start(@Body() body: unknown): Promise<RunStatus> {
    const request = this.parse(body);
    if (!isBounded(request.bound)) {
      throw new BadRequestException(
        'a run needs maxCandidates, maxDurationMs, or both — see docs/decisions/0021',
      );
    }
    try {
      return await this.search.start(request.datasetId, request.bound);
    } catch (error) {
      if (error instanceof RunAlreadyActiveError) throw new ConflictException(error.message);
      throw error;
    }
  }

  @Post('runs/pause')
  pause(): Promise<RunStatus> {
    return this.guard(() => this.search.pause());
  }

  @Post('runs/resume')
  resume(): Promise<RunStatus> {
    return this.guard(() => this.search.resume());
  }

  @Post('runs/stop')
  stop(): Promise<RunStatus> {
    return this.guard(() => this.search.stop());
  }

  @Get('runs/current')
  status(): RunStatus {
    const status = this.search.status();
    if (!status) throw new NotFoundException('no run has been started');
    return status;
  }

  private parse(body: unknown): ReturnType<typeof parseStartRun> {
    try {
      return parseStartRun(body);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'invalid request');
    }
  }

  private async guard(action: () => Promise<RunStatus>): Promise<RunStatus> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof NoActiveRunError) throw new NotFoundException(error.message);
      throw error;
    }
  }
}
