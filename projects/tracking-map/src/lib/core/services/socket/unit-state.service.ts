import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { TrackingPosition } from '../../models/tracking_position';

@Injectable({
  providedIn: 'root',
})
export class UnitStateService {
  private readonly unitsSubject = new BehaviorSubject<Map<string, TrackingPosition>>(new Map());

  readonly units$ = this.unitsSubject.asObservable();
  readonly positions$ = this.units$.pipe(map((units) => Array.from(units.values())));

  upsert(position: TrackingPosition): void {
    const next = new Map(this.unitsSubject.value);
    next.set(this.resolveKey(position.unit_id), position);
    this.unitsSubject.next(next);
  }

  clear(): void {
    this.unitsSubject.next(new Map());
  }

  private resolveKey(unitId: string | number): string {
    return String(unitId);
  }
}
