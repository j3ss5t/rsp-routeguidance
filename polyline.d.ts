declare module "@mapbox/polyline" {
  export function decode(encoded_polyline: String): number[][];
  export function encode(polyline: number[][]): String;
}
