export type WebsocketChannelType = 'public' | 'private' | 'presence';

export interface WebsocketChannelSubscription {
  channel: string;
  event: string;
  channelType: WebsocketChannelType;
}
