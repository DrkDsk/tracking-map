import { Injectable } from '@angular/core';
import {
  EMPTY,
  Observable,
  groupBy,
  map,
  mergeMap,
  of,
  scan,
  switchMap,
  takeWhile,
  timer,
} from 'rxjs';
import { TrackingPosition } from '../../models/tracking_position';

interface AnimationAccumulator {
  previous: TrackingPosition | null;
  current: TrackingPosition | null;
}

@Injectable({
  providedIn: 'root',
})
export class MarkerAnimationService {
  animate(
    positions$: Observable<TrackingPosition>,
    durationMs: number,
    frameMs: number,
  ): Observable<TrackingPosition> {
    return positions$.pipe(
      groupBy((position) => String(position.unit_id)),
      mergeMap((unit$) =>
        unit$.pipe(
          scan<TrackingPosition, AnimationAccumulator>(
            (state, current) => ({
              previous: state.current,
              current,
            }),
            {
              previous: null,
              current: null,
            },
          ),
          switchMap(({ previous, current }) => {
            if (!current) {
              return EMPTY;
            }

            if (!previous || this.positionsMatch(previous, current)) {
              return of(current);
            }

            return timer(0, frameMs).pipe(
              map((tick) => (tick * frameMs) / durationMs),
              takeWhile((progress) => progress <= 1),
              map((progress) => this.interpolate(previous, current, Math.min(progress, 1))),
            );
          }),
        ),
      ),
    );
  }

  private interpolate(
    start: TrackingPosition,
    end: TrackingPosition,
    progress: number,
  ): TrackingPosition {
    if (progress >= 1) {
      return end;
    }

    return {
      ...end,
      lat: start.lat + (end.lat - start.lat) * progress,
      lng: start.lng + (end.lng - start.lng) * progress,
      rendered_at: Date.now(),
      source: 'animation',
      is_interpolated: true,
    };
  }

  private positionsMatch(previous: TrackingPosition, current: TrackingPosition): boolean {
    return previous.lat === current.lat && previous.lng === current.lng;
  }
}
