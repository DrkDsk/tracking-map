import { WebsocketChannelSubscription } from './websocket_channel_subscription';

export interface WebsocketMessage extends WebsocketChannelSubscription {
  payload: unknown;
  received_at: number;
}
