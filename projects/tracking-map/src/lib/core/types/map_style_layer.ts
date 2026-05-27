import type { StyleSpecification } from 'maplibre-gl';

export type MapStyleLayer = StyleSpecification['layers'][number];
export type RasterLayer = Extract<MapStyleLayer, { type: 'raster' }>;
export type LineLayer = Extract<MapStyleLayer, { type: 'line' }>;
export type SymbolLayer = Extract<MapStyleLayer, { type: 'symbol' }>;
export type FillLayer = Extract<MapStyleLayer, { type: 'fill' }>;
export type FillExtrusionLayer = Extract<MapStyleLayer, { type: 'fill-extrusion' }>;
