import { inject, Injectable } from '@angular/core';
import { filter, Observable } from 'rxjs';
import { WebsocketConfig } from '../../models/websocket_config';
import { WebsocketMessage } from '../../models/websocket_message';
import { ReverbSocketClient } from './reverb-socket.client';

@Injectable({
  providedIn: 'root',
})
export class TrackingSocketService {
  private socketClient = inject(ReverbSocketClient);

  readonly connectionState$ = this.socketClient.connectionState$;

  stream(config: WebsocketConfig): Observable<WebsocketMessage> {
    return new Observable<WebsocketMessage>((observer) => {
      const subscription = {
        channel: config.channel,
        event: config.event,
        channelType: config.channelType,
      } as const;

      console.log('Subscribing to channel:', subscription);

      this.socketClient.connect(config);
      this.socketClient.subscribe(subscription);

      const messagesSubscription = this.socketClient.messages$
        .pipe(
          filter(
            (message) =>
              message.channel === subscription.channel &&
              message.event === subscription.event &&
              message.channelType === subscription.channelType,
          ),
        )
        .subscribe(observer);

      return () => {
        messagesSubscription.unsubscribe();
        this.socketClient.unsubscribe(subscription);
      };
    });
  }

  disconnect(): void {
    this.socketClient.disconnect();
  }
}
