import { Injectable } from '@angular/core';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { BehaviorSubject, Subject } from 'rxjs';
import { WebsocketClient } from '../../contracts/websocket-client.interface';
import {
  WebsocketChannelSubscription,
  WebsocketChannelType,
} from '../../models/websocket_channel_subscription';
import { WebsocketConfig } from '../../models/websocket_config';
import { WebsocketConnectionState } from '../../models/websocket_connection_state';
import { WebsocketMessage } from '../../models/websocket_message';

type ReverbChannel =
  | ReturnType<Echo<'reverb'>['channel']>
  | ReturnType<Echo<'reverb'>['private']>
  | ReturnType<Echo<'reverb'>['join']>;

interface SubscriptionEntry {
  channel: ReverbChannel;
  callback: CallableFunction;
  refCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReverbSocketClient implements WebsocketClient {
  private echo?: Echo<'reverb'>;
  private connectionCleanup?: () => void;
  private activeFingerprint?: string;
  private subscriptions = new Map<string, SubscriptionEntry>();

  private readonly connectionStateSubject = new BehaviorSubject<WebsocketConnectionState>(
    'disconnected',
  );
  private readonly messagesSubject = new Subject<WebsocketMessage>();

  readonly connectionState$ = this.connectionStateSubject.asObservable();
  readonly messages$ = this.messagesSubject.asObservable();

  connect(config: WebsocketConfig): void {
    const nextFingerprint = this.buildConnectionFingerprint(config);

    if (this.echo && this.activeFingerprint === nextFingerprint) {
      return;
    }

    this.disconnect();
    this.connectionStateSubject.next('connecting');

    this.echo = new Echo<'reverb'>({
      broadcaster: 'reverb',
      key: config.key,
      wsHost: config.host,
      wsPort: config.port,
      wssPort: config.port,
      forceTLS: config.scheme === 'https',
      enabledTransports: config.enabledTransports,
      namespace: config.namespace ?? false,
      authEndpoint: config.auth?.endpoint,
      auth: {
        headers: config.auth?.headers ?? {},
      },
      bearerToken: config.auth?.bearerToken,
      withCredentials: config.auth?.withCredentials ?? false,
      activityTimeout: config.activityTimeout,
      pongTimeout: config.pongTimeout,
      unavailableTimeout: config.unavailableTimeout,
      wsPath: config.path || undefined,
      Pusher,
    });

    this.echo.connect();
    this.activeFingerprint = nextFingerprint;
    this.connectionCleanup = this.echo.connector.onConnectionChange((state) => {
      const nextState =
        state === 'connecting' && this.connectionStateSubject.value === 'connected'
          ? 'reconnecting'
          : state;

      this.connectionStateSubject.next(nextState);
    });
  }

  disconnect(): void {
    this.subscriptions.clear();
    this.connectionCleanup?.();
    this.connectionCleanup = undefined;
    this.echo?.disconnect();
    this.echo = undefined;
    this.activeFingerprint = undefined;
    this.connectionStateSubject.next('disconnected');
  }

  subscribe(subscription: WebsocketChannelSubscription): void {
    const channelKey = this.buildSubscriptionKey(subscription);
    const existing = this.subscriptions.get(channelKey);

    if (existing) {
      existing.refCount += 1;
      return;
    }

    if (!this.echo) {
      throw new Error('ReverbSocketClient.connect must be called before subscribe.');
    }

    const channel = this.resolveChannel(subscription);
    const callback = (payload: unknown) => {
      this.messagesSubject.next({
        ...subscription,
        payload,
        received_at: Date.now(),
      });
    };

    channel.subscribed(() => {
      this.connectionStateSubject.next('connected');
    });

    channel.error(() => {
      this.connectionStateSubject.next('failed');
    });

    channel.listen(subscription.event, callback);

    this.subscriptions.set(channelKey, {
      channel,
      callback,
      refCount: 1,
    });
  }

  unsubscribe(subscription: WebsocketChannelSubscription): void {
    const channelKey = this.buildSubscriptionKey(subscription);
    const existing = this.subscriptions.get(channelKey);

    if (!existing) {
      return;
    }

    existing.refCount -= 1;

    if (existing.refCount > 0) {
      return;
    }

    existing.channel.stopListening(subscription.event, existing.callback);
    this.leaveChannel(subscription);
    this.subscriptions.delete(channelKey);

    if (this.subscriptions.size === 0) {
      this.disconnect();
    }
  }

  private buildSubscriptionKey(subscription: WebsocketChannelSubscription): string {
    return `${subscription.channelType}:${subscription.channel}:${subscription.event}`;
  }

  private buildConnectionFingerprint(config: WebsocketConfig): string {
    return JSON.stringify({
      provider: config.provider,
      broadcaster: config.broadcaster,
      key: config.key,
      host: config.host,
      port: config.port,
      scheme: config.scheme,
      path: config.path,
      namespace: config.namespace,
      enabledTransports: config.enabledTransports,
      auth: config.auth,
      reconnect: config.reconnect,
      activityTimeout: config.activityTimeout,
      pongTimeout: config.pongTimeout,
      unavailableTimeout: config.unavailableTimeout,
    });
  }

  private resolveChannel(subscription: WebsocketChannelSubscription): ReverbChannel {
    if (!this.echo) {
      throw new Error('ReverbSocketClient.connect must be called before resolving channels.');
    }

    switch (subscription.channelType) {
      case 'private':
        return this.echo.private(subscription.channel);
      case 'presence':
        return this.echo.join(subscription.channel);
      default:
        return this.echo.channel(subscription.channel);
    }
  }

  private leaveChannel(subscription: WebsocketChannelSubscription): void {
    if (!this.echo) {
      return;
    }

    const channelName = this.resolveChannelName(subscription.channel, subscription.channelType);
    this.echo.leaveChannel(channelName);
  }

  private resolveChannelName(channel: string, type: WebsocketChannelType): string {
    switch (type) {
      case 'private':
        return `private-${channel}`;
      case 'presence':
        return `presence-${channel}`;
      default:
        return channel;
    }
  }
}
