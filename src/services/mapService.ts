import axios from 'axios';
import { MAP_CONFIG } from '../constants/map';

/**
 * Decodes a Google-encoded polyline string into an array of [longitude, latitude] coordinates.
 * This is pure TypeScript, highly performant, and has no external dependencies.
 */
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    // Mapbox requires [longitude, latitude] coordinates
    points.push([lng / 1e5, lat / 1e5]);
  }
  return points;
}

export const mapService = {
  /**
   * Fetches driving route coordinates between origin and destination coordinates.
   * If Goong API key is not configured, it returns a straight line fallback.
   *
   * @param origin [latitude, longitude] of the starting point
   * @param destination [latitude, longitude] of the ending point
   * @param vehicle The type of vehicle (e.g. 'car', 'bike', 'taxi')
   */
  getDirections: async (
    origin: [number, number],
    destination: [number, number],
    vehicle: string = 'car',
  ): Promise<[number, number][]> => {
    const apiKey = MAP_CONFIG.GOONG_API_KEY;

    // Check if a valid Goong API key is configured
    if (!apiKey || apiKey === 'YOUR_GOONG_API_KEY') {
      // Fallback: Return straight line coords [lng, lat]
      return [
        [origin[1], origin[0]],
        [destination[1], destination[0]],
      ];
    }

    try {
      const url = `${MAP_CONFIG.GOONG_API_URL}/Direction?vehicle=${vehicle}&origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}&api_key=${apiKey}`;
      const response = await axios.get(url);

      const routes = response.data?.routes;
      if (routes && routes.length > 0) {
        const encodedPolyline = routes[0].overview_polyline?.points;
        if (encodedPolyline) {
          return decodePolyline(encodedPolyline);
        }
      }
    } catch (error) {
      console.warn(
        'Goong Direction API failed or returned an error, falling back to straight line:',
        error,
      );
    }

    // Fallback: Return straight line coords [lng, lat]
    return [
      [origin[1], origin[0]],
      [destination[1], destination[0]],
    ];
  },
};
