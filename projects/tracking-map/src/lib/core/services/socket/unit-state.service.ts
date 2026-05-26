import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { TrackingPosition } from '../../models/tracking_position';
import {
  normalizeTrackingUnitInput,
  TrackingUnitInput,
} from '../../models/tracking_unit_reference';

@Injectable({
  providedIn: 'root',
})
export class UnitStateService {
  private readonly injector = inject(Injector);
  private readonly unitsState = signal<Map<string, TrackingPosition>>(new Map());

  readonly units = computed(() => this.unitsState());
  readonly positions = computed(() => Array.from(this.unitsState().values()));

  readonly units$ = toObservable(this.units, { injector: this.injector });
  readonly positions$ = toObservable(this.positions, { injector: this.injector });

  upsert(position: TrackingPosition): void {
    const next = new Map(this.unitsState());
    next.set(this.resolveKey(position.unit_id), position);
    this.unitsState.set(next);
  }

  remove(unit: TrackingUnitInput): void {
    const unitReference = normalizeTrackingUnitInput(unit);
    const next = new Map(this.unitsState());
    next.delete(this.resolveKey(unitReference.unitId));
    this.unitsState.set(next);
  }

  clear(): void {
    this.unitsState.set(new Map());
  }

  private resolveKey(unitId: string | number): string {
    return String(unitId);
  }
}
