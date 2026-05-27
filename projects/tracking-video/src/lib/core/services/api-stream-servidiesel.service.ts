import { inject, Injectable } from '@angular/core';
import { ApiStreamService } from '../contracts/api_stream.service';
import { Observable, of } from 'rxjs';
import { StreamVideoResponse } from '../models/stream_video_response';
import { ApiClient } from '../http/api-client.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiStreamServiDieselService implements ApiStreamService {
  private api = inject(ApiClient);

  private readonly baseUrl = environment.providers.servidiesel;

  getStreamUrls(unitId: string | number): Observable<StreamVideoResponse> {
    return of<StreamVideoResponse>({
      urls: [
        'https://america-ftcloud.ifleetvision.com:22001/video/21389026-7eb9-5327-590-b5bf690e3c737.flv',
        'https://america-ftcloud.ifleetvision.com:22001/video/e9fa90c2-fba9-f50a-090-ce90c905216c9.flv',
      ],
    });

    //return this.api.get<StreamVideoResponse>(this.baseUrl, `/api/units/${unitId}}/stream-video`);
  }
}
