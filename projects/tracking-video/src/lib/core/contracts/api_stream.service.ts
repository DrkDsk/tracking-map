import { Observable } from 'rxjs';
import { StreamVideoResponse } from '../models/stream_video_response';

export interface ApiStreamService {
  getStreamUrls(unitId: string | number): Observable<StreamVideoResponse>;
}
