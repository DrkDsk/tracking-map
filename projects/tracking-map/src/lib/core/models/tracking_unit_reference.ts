export interface TrackingUnitReference<TUnit = string | number> {
  unitId: string | number;
  raw: TUnit;
}

export type TrackingUnitInput<TUnit = string | number> =
  | string
  | number
  | TrackingUnitReference<TUnit>;

export const normalizeTrackingUnitInput = <TUnit>(
  unit: TrackingUnitInput<TUnit>,
): TrackingUnitReference<TUnit | string | number> => {
  if (typeof unit === 'string' || typeof unit === 'number') {
    return {
      unitId: unit,
      raw: unit,
    };
  }

  return unit;
};
