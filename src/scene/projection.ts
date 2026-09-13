// Equirectangular projection centred roughly on Lancaster. SCALE controls
// how big the map is in scene units (one unit ≈ ~40 miles at this latitude).

const LAT_C = 54.0;
const LNG_C = -2.5;
export const SCALE = 3.6;

export function proj(lng: number, lat: number): [number, number] {
  return [
    (lng - LNG_C) * Math.cos((LAT_C * Math.PI) / 180) * SCALE,
    -(lat - LAT_C) * SCALE,
  ];
}