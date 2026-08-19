import {
  ConnectedSocket,
  MessageBody,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Observable, Subject } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { CHANNEL, type ServerMessage } from '@csl/contracts';
import { ChannelPublisher } from './ports/channel-publisher.port';
import { TopicAudience, type TopicAudienceChange } from './ports/topic-audience.port';

/**
 * The one channel out to the browser (ADR 0017, 0019). It holds no domain vocabulary:
 * a topic is a string it matches, and rooms are only how the matching is implemented.
 *
 * Subscriptions live for the connection and no longer — a client that reconnects holds
 * nothing until it subscribes again.
 */
@WebSocketGateway({ path: CHANNEL.path })
export class RealtimeGateway
  implements ChannelPublisher, TopicAudience, OnGatewayDisconnect
{
  private readonly subscribers = new Map<string, Set<string>>();
  private readonly audience = new Subject<TopicAudienceChange>();

  @WebSocketServer()
  private readonly server!: Server;

  publish(topic: string, message: ServerMessage): void {
    this.server.to(topic).emit(topic, message);
  }

  changes(): Observable<TopicAudienceChange> {
    return this.audience.asObservable();
  }

  @SubscribeMessage(CHANNEL.subscribe)
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() topic: unknown,
  ): void {
    if (typeof topic !== 'string' || topic.length === 0) return;

    void client.join(topic);
    const held = this.subscribers.get(topic) ?? new Set<string>();
    this.subscribers.set(topic, held);
    if (held.size === 0) {
      held.add(client.id);
      this.audience.next({ topic, watched: true });
      return;
    }
    held.add(client.id);
  }

  @SubscribeMessage(CHANNEL.unsubscribe)
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() topic: unknown,
  ): void {
    if (typeof topic !== 'string') return;
    void client.leave(topic);
    this.release(client.id, topic);
  }

  handleDisconnect(client: Socket): void {
    for (const topic of [...this.subscribers.keys()]) {
      this.release(client.id, topic);
    }
  }

  private release(clientId: string, topic: string): void {
    const held = this.subscribers.get(topic);
    if (!held?.delete(clientId)) return;
    if (held.size > 0) return;
    this.subscribers.delete(topic);
    this.audience.next({ topic, watched: false });
  }
}
