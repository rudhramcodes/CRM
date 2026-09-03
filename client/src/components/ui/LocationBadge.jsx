import { useState, useEffect } from 'react';
import { Building2, MapPin, ExternalLink } from 'lucide-react';

export const RUDHRAM_OFFICE = {
  name: 'Office (Rudhram Enterprises)',
  lat: 21.1490864,
  lng: 72.7760101,
  radiusMeters: 200,
};

// Haversine distance calculator
export const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

// Global in-memory cache for resolved reverse geocoding
const geocodeCache = new Map();

export default function LocationBadge({ location, size = 'md', className = '' }) {
  const [resolvedName, setResolvedName] = useState(location?.locationName || null);

  const lat = location?.lat;
  const lng = location?.lng;

  if (lat == null || lng == null) return null;

  const dist = getDistanceMeters(RUDHRAM_OFFICE.lat, RUDHRAM_OFFICE.lng, lat, lng);
  const isOffice = location?.isOffice || (dist != null && dist <= RUDHRAM_OFFICE.radiusMeters);

  useEffect(() => {
    if (isOffice) {
      setResolvedName(RUDHRAM_OFFICE.name);
      return;
    }

    if (location?.locationName) {
      setResolvedName(location.locationName);
      return;
    }

    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (geocodeCache.has(key)) {
      setResolvedName(geocodeCache.get(key));
      return;
    }

    // Reverse geocode via OpenStreetMap Nominatim
    let isMounted = true;
    const fetchArea = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        if (!res.ok) return;
        const data = await res.json();
        const addr = data.address || {};
        const parts = [
          addr.suburb || addr.neighbourhood || addr.county || addr.road,
          addr.city || addr.state_district || addr.town,
        ].filter(Boolean);
        const name = parts.join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || 'Unknown Location';
        geocodeCache.set(key, name);
        if (isMounted) setResolvedName(name);
      } catch (e) {
        // Silently fallback to coordinates
      }
    };

    fetchArea();
    return () => {
      isMounted = false;
    };
  }, [lat, lng, isOffice, location?.locationName]);

  const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  if (size === 'sm') {
    return (
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={`View on Google Maps (${lat.toFixed(4)}, ${lng.toFixed(4)})`}
        className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded transition-colors ${
          isOffice
            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
        } ${className}`}
      >
        {isOffice ? (
          <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
        ) : (
          <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
        )}
        <span className="truncate max-w-[120px]">{isOffice ? 'Office' : resolvedName || `${lat.toFixed(3)}, ${lng.toFixed(3)}`}</span>
      </a>
    );
  }

  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Open location in Google Maps"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all group ${
        isOffice
          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100/80 border border-emerald-200'
          : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200'
      } ${className}`}
    >
      {isOffice ? (
        <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      ) : (
        <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
      )}
      <span className="font-semibold">
        {isOffice ? RUDHRAM_OFFICE.name : resolvedName || `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
      </span>
      {dist != null && (
        <span className="text-[10px] text-zinc-400 font-normal">
          ({dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`})
        </span>
      )}
      <ExternalLink className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600 shrink-0 opacity-70 group-hover:opacity-100" />
    </a>
  );
}
