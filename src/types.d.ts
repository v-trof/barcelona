declare module '@mapbox/vector-tile' {
  export class VectorTile {
    constructor(pbf: any);
    layers: Record<string, any>;
  }
}

declare module 'pbf' {
  export default class Pbf {
    constructor(buf: Buffer);
  }
}

declare module '@turf/turf' {
  export function bboxPolygon(bbox: [number, number, number, number]): any;
  export function point(coords: [number, number]): any;
  export function destination(origin: any, distance: number, bearing: number, options?: any): any;
  export function bbox(feature: any): [number, number, number, number];
  export function buffer(feature: any, radius: number, options?: any): any;
  export function booleanIntersects(feature1: any, feature2: any): boolean;
}
