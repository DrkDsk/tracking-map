import { Waypoint } from './waypoint';

export interface OutboundOrder {
  id: number;
  id_seguimiento: string;
  waypoints: Waypoint[];
}
