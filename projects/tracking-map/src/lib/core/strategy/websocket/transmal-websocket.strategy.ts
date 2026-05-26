import { Injectable } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { ClientType } from '../../enums/provider_type';
import { WebsocketEnvironmentConfig } from '../../models/websocket_config';
import { BaseReverbWebsocketStrategy } from './base-reverb-websocket.strategy';

@Injectable({
  providedIn: 'root',
})
export class TransmalWebsocketStrategy extends BaseReverbWebsocketStrategy {
  readonly provider: ClientType = 'transmal';

  protected getEnvironmentConfig(): WebsocketEnvironmentConfig {
    return environment.websocket.transmal as WebsocketEnvironmentConfig;
  }
}
