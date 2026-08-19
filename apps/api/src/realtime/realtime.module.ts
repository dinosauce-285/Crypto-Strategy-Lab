import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { ChannelPublisher } from './ports/channel-publisher.port';
import { TopicAudience } from './ports/topic-audience.port';

/**
 * Exports two abstractions and the gateway itself stays private, so a module that
 * pushes depends on what it needs rather than on the transport (ADR 0020).
 */
@Module({
  providers: [
    RealtimeGateway,
    { provide: ChannelPublisher, useExisting: RealtimeGateway },
    { provide: TopicAudience, useExisting: RealtimeGateway },
  ],
  exports: [ChannelPublisher, TopicAudience],
})
export class RealtimeModule {}
