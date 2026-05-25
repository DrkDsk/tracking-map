export type WebsocketConnectionState =
  | 'connected'
  | 'disconnected'
  | 'connecting'
  | 'reconnecting'
  | 'failed';
