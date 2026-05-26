import { inject, Injectable } from '@angular/core';
import { WebsocketStrategy } from '../contracts/websocket-strategy.interface';
import { ClientType } from '../enums/provider_type';
import { ServidieselWebsocketStrategy } from './websocket/servidiesel-websocket.strategy';
import { TransmalWebsocketStrategy } from './websocket/transmal-websocket.strategy';

@Injectable({ providedIn: 'root' })
export class WebsocketStrategyResolver {
  private serviDiesel = inject(ServidieselWebsocketStrategy);
  private transmal = inject(TransmalWebsocketStrategy);

  resolve(provider: ClientType): WebsocketStrategy {
    switch (provider) {
      case 'servidiesel':
        return this.serviDiesel;
      case 'transmal':
        return this.transmal;
      default:
        return this.serviDiesel;
    }
  }
}
