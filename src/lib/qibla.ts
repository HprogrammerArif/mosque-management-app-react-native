/**
 * Qibla direction calculation relative to the Holy Kaaba in Makkah.
 * Kaaba coordinates: 21.422487° N, 39.826206° E
 */

export const KAABA_COORDS = {
  latitude: 21.422487,
  longitude: 39.826206,
};

export type QiblaResult = {
  degrees: number;
  compassDirection: string;
};

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
];

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Computes forward azimuth (great-circle bearing) from geographic coordinates to the Kaaba.
 */
export function calculateQibla(latitude: number, longitude: number): QiblaResult {
  const phi1 = toRadians(latitude);
  const lambda1 = toRadians(longitude);
  const phi2 = toRadians(KAABA_COORDS.latitude);
  const lambda2 = toRadians(KAABA_COORDS.longitude);

  const deltaLambda = lambda2 - lambda1;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;

  const roundedDegrees = Math.round(bearing);
  const index = Math.round(roundedDegrees / 22.5) % 16;
  const compassDirection = COMPASS_POINTS[index] ?? 'N';

  return {
    degrees: roundedDegrees,
    compassDirection,
  };
}
