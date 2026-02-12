/**
 * Weather service using Open-Meteo (free, no API key required).
 * Fetches temperature, UV index, and humidity for sun/heat alerts.
 */

export interface WeatherData {
  tempC: number;
  humidity: number;
  uvIndex: number;
  condition: string;
  isHot: boolean;
  isHighUV: boolean;
  heatIndexC?: number;
}

// Approximate heat index (simplified formula)
function heatIndex(tempC: number, humidity: number): number {
  const T = (tempC * 9) / 5 + 32;
  const R = humidity;
  const hi = -42.379 + 2.04901523 * T + 10.14333127 * R - 0.22475541 * T * R
    - 6.83783e-3 * T * T - 5.481717e-2 * R * R + 1.22874e-3 * T * T * R
    + 8.5282e-4 * T * R * R - 1.99e-6 * T * T * R * R;
  return ((hi - 32) * 5) / 9;
}

export async function getWeatherAtLocation(lat: number, lon: number): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,uv_index,weather_code`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const cur = data?.current;
    if (!cur) return null;

    const tempC = cur.temperature_2m ?? 25;
    const humidity = cur.relative_humidity_2m ?? 50;
    const uvIndex = cur.uv_index ?? 0;
    const code = cur.weather_code ?? 0;

    const conditions: Record<number, string> = {
      0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Foggy', 51: 'Drizzle', 61: 'Rain', 80: 'Showers',
      95: 'Thunderstorm', 96: 'Thunderstorm',
    };
    const condition = conditions[code] ?? 'Unknown';

    const heatIndexC = humidity > 40 && tempC > 27 ? heatIndex(tempC, humidity) : undefined;
    const isHot = tempC >= 32 || (heatIndexC !== undefined && heatIndexC >= 32);
    const isHighUV = uvIndex >= 7;

    return {
      tempC,
      humidity,
      uvIndex,
      condition,
      isHot,
      isHighUV,
      heatIndexC,
    };
  } catch {
    return null;
  }
}
