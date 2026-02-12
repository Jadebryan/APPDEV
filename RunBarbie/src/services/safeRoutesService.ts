/**
 * Safe routes service using Overpass API (OpenStreetMap - free, no API key).
 * Fetches nearby parks, paths, and recreational areas for safer running suggestions.
 */

export interface SafePlace {
  id: string;
  name: string;
  type: 'park' | 'path' | 'recreation' | 'sports';
  lat: number;
  lon: number;
  distanceKm: number;
}

export async function getNearbySafePlaces(lat: number, lon: number, radiusM = 2000): Promise<SafePlace[]> {
  try {
    // Overpass bbox: south, west, north, east
    const delta = radiusM / 111320;
    const south = lat - delta;
    const north = lat + delta;
    const west = lon - delta;
    const east = lon + delta;
    const bbox = `${south},${west},${north},${east}`;

    const query = `[out:json][timeout:15][bbox:${bbox}];(node["leisure"="park"];node["leisure"="playground"];way["leisure"="park"];way["highway"="path"];);out center;`;

    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
    );
    if (!res.ok) return [];

    const data = await res.json();
    const elements = data?.elements ?? [];
    const places: SafePlace[] = [];
    const seen = new Set<string>();

    for (const el of elements) {
      const center = el.center || el;
      const plat = center.lat ?? el.lat;
      const plon = center.lon ?? el.lon;
      if (plat == null || plon == null) continue;

      const dist = haversineKm(lat, lon, plat, plon);
      if (dist > (radiusM / 1000)) continue;

      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || (el.type === 'way' ? 'Path' : 'Park');
      const type = tags.leisure === 'park' || tags.leisure === 'playground'
        ? 'park'
        : tags.leisure === 'pitch'
          ? 'sports'
          : tags.highway === 'path'
            ? 'path'
            : 'recreation';

      const key = `${plat.toFixed(5)}-${plon.toFixed(5)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      places.push({
        id: el.id?.toString() || key,
        name,
        type,
        lat: plat,
        lon: plon,
        distanceKm: Math.round(dist * 100) / 100,
      });
    }

    places.sort((a, b) => a.distanceKm - b.distanceKm);
    return places.slice(0, 15);
  } catch {
    return [];
  }
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
