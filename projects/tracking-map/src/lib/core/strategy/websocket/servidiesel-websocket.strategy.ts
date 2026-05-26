import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ClientType } from '../../enums/provider_type';
import { WebsocketEnvironmentConfig } from '../../models/websocket_config';
import { BaseReverbWebsocketStrategy } from './base-reverb-websocket.strategy';

@Injectable({
  providedIn: 'root',
})
export class ServidieselWebsocketStrategy extends BaseReverbWebsocketStrategy {
  readonly provider: ClientType = 'servidiesel';

  protected getEnvironmentConfig(): WebsocketEnvironmentConfig {
    return environment.websocket.servidiesel as WebsocketEnvironmentConfig;
  }
}
