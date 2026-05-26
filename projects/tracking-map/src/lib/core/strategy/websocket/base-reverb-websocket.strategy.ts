import { ClientType } from '../../enums/provider_type';
import { TrackingPosition, TrackingPositionPayload } from '../../models/tracking_position';
import { TrackingUnitInput } from '../../models/tracking_unit_reference';
import { WebsocketConfig, WebsocketEnvironmentConfig } from '../../models/websocket_config';
import { WebsocketStrategy } from '../../contracts/websocket-strategy.interface';

export abstract class BaseReverbWebsocketStrategy implements WebsocketStrategy {
  abstract readonly provider: ClientType;

  protected abstract getEnvironmentConfig(): WebsocketEnvironmentConfig;

  getConfig(unit: TrackingUnitInput): WebsocketConfig {
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
      channel: this.resolveChannel(config.channel, unit),
      event: `.${config.event}`,
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

  parse(payload: unknown, unit: TrackingUnitInput): TrackingPosition | null {
    if (!this.isRealtimePayload(payload)) {
      return null;
    }

    const lat = Number(payload.lat);
    const lng = Number(payload.lng);
    const payloadUnitId = payload.unit_id ?? unit;
    const receivedAt = Date.now();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return {
      unit_id: payloadUnitId,
      unit_device_id: payload.unit_device_id,
      unique_id: payload.unique_id,
      lat,
      lng,
      acc: payload.acc,
      angle: payload.angle,
      speed: payload.speed,
      gps_time: payload.gps_time,
      provider: this.provider,
      received_at: receivedAt,
      rendered_at: receivedAt,
      source: 'websocket',
      is_interpolated: false,
    };
  }

  shouldHandle(position: TrackingPosition, unit: TrackingUnitInput): boolean {
    return String(position.unit_id) === String(unit);
  }

  protected resolveChannel(channelTemplate: string, unitId: string | number): string {
    return channelTemplate.replaceAll('{unitId}', String(unitId));
  }

  private isRealtimePayload(payload: unknown): payload is TrackingPositionPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const candidate = payload as Record<string, unknown>;

    return (
      'unit_id' in candidate &&
      (typeof candidate['unit_id'] === 'string' || typeof candidate['unit_id'] === 'number') &&
      'unit_device_id' in candidate &&
      (typeof candidate['unit_device_id'] === 'string' ||
        typeof candidate['unit_device_id'] === 'number') &&
      'unique_id' in candidate &&
      (typeof candidate['unique_id'] === 'string' || typeof candidate['unique_id'] === 'number') &&
      'lat' in candidate &&
      typeof candidate['lat'] === 'number' &&
      'lng' in candidate &&
      typeof candidate['lng'] === 'number' &&
      'speed' in candidate &&
      typeof candidate['speed'] === 'number' &&
      'angle' in candidate &&
      typeof candidate['angle'] === 'number' &&
      'acc' in candidate &&
      typeof candidate['acc'] === 'boolean' &&
      'gps_time' in candidate &&
      typeof candidate['gps_time'] === 'string'
    );
  }
}
