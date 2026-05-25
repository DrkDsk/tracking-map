import { ClientType } from '../../enums/provider_type';
import { TrackingPosition } from '../../models/tracking_position';
import { WebsocketConfig, WebsocketEnvironmentConfig } from '../../models/websocket_config';
import { WebsocketStrategy } from '../../contracts/websocket-strategy.interface';

export abstract class BaseReverbWebsocketStrategy implements WebsocketStrategy {
  abstract readonly provider: ClientType;

  protected abstract getEnvironmentConfig(): WebsocketEnvironmentConfig;

  getConfig(unitId: string | number): WebsocketConfig {
    const config = this.getEnvironmentConfig();

    return {
      provider: this.provider,
      broadcaster: 'reverb',
      key: config.key,
      host: config.host,
      port: config.port,
      scheme: config.scheme,
      path: config.path,
      namespace: config.namespace ?? false,
      channelType: config.channelType,
      channel: this.resolveChannel(config.channel, unitId),
      event: config.event,
      enabledTransports: config.enabledTransports,
      auth: {
        endpoint: config.authEndpoint,
        headers: config.authHeaders,
        bearerToken: config.bearerToken,
        withCredentials: config.withCredentials,
      },
      reconnect: config.reconnect,
      throttle: config.throttle,
      activityTimeout: config.activityTimeout,
      pongTimeout: config.pongTimeout,
      unavailableTimeout: config.unavailableTimeout,
    };
  }

  parse(payload: unknown, unitId: string | number): TrackingPosition | null {
    if (!this.isRealtimePayload(payload)) {
      return null;
    }

    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    const payloadUnitId = payload.unit_id ?? unitId;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return {
      unit_id: payloadUnitId,
      lat,
      lng,
      provider: this.provider,
      received_at: Date.now(),
      source: 'websocket',
      event_name: this.getConfig(payloadUnitId).event,
      raw: payload,
    };
  }

  shouldHandle(position: TrackingPosition, unitId: string | number): boolean {
    return String(position.unit_id) === String(unitId);
  }

  protected resolveChannel(channelTemplate: string, unitId: string | number): string {
    return channelTemplate.replaceAll('{unitId}', String(unitId));
  }

  private isRealtimePayload(
    payload: unknown,
  ): payload is { lat: number; lng: number; unit_id?: string | number } {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    return 'lat' in payload && 'lng' in payload;
  }
}
