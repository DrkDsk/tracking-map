import { Observable } from 'rxjs';
import { WebsocketChannelSubscription } from '../models/websocket_channel_subscription';
import { WebsocketConfig } from '../models/websocket_config';
import { WebsocketConnectionState } from '../models/websocket_connection_state';
import { WebsocketMessage } from '../models/websocket_message';

export interface WebsocketClient {
  readonly connectionState$: Observable<WebsocketConnectionState>;
  readonly messages$: Observable<WebsocketMessage>;
  connect(config: WebsocketConfig): void;
  disconnect(): void;
  subscribe(subscription: WebsocketChannelSubscription): void;
  unsubscribe(subscription: WebsocketChannelSubscription): void;
}
