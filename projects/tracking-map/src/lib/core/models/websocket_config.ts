import { ClientType } from '../types/provider_type';
import { WebsocketChannelType } from './websocket_channel_subscription';

export type WebsocketTransport = 'ws' | 'wss';

export interface WebsocketAuthConfig {
  endpoint?: string;
  headers?: Record<string, string>;
  bearerToken?: string;
  withCredentials?: boolean;
}

export interface WebsocketReconnectConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface WebsocketThrottleConfig {
  positionIntervalMs: number;
  animationDurationMs: number;
  animationFrameMs: number;
}

export interface WebsocketConfig {
  provider: ClientType;
  broadcaster: 'reverb';
  key: string;
  host: string;
  port: number;
  scheme: 'http' | 'https';
  path?: string;
  namespace?: string | false;
  channelType: WebsocketChannelType;
  channel: string;
  event: string;
  enabledTransports: WebsocketTransport[];
  auth?: WebsocketAuthConfig;
  reconnect: WebsocketReconnectConfig;
  throttle: WebsocketThrottleConfig;
  activityTimeout?: number;
  pongTimeout?: number;
  unavailableTimeout?: number;
}

export type WebsocketEnvironmentConfig = Omit<WebsocketConfig, 'provider' | 'channel'> & {
  channel: string;
  authEndpoint?: string;
  authHeaders?: Record<string, string>;
  bearerToken?: string;
  withCredentials?: boolean;
};
