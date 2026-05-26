import { WebsocketChannelSubscription } from './websocket_channel_subscription';

export interface WebsocketMessage<TPayload = unknown> extends WebsocketChannelSubscription {
  payload: TPayload;
  received_at: number;
}
