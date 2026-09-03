export const RUDHRAM_OFFICE = {
  name: 'Office (Rudhram Enterprises)',
  lat: 21.1490864,
  lng: 72.7760101,
  radiusMeters: 200,
};

export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
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

export const resolveLocationDetails = async (location) => {
  if (!location || location.lat == null || location.lng == null) {
    return location || {};
  }

  const dist = calculateDistanceMeters(
    RUDHRAM_OFFICE.lat,
    RUDHRAM_OFFICE.lng,
    location.lat,
    location.lng
  );

  const isOffice = dist != null && dist <= RUDHRAM_OFFICE.radiusMeters;

  if (isOffice) {
    return {
      lat: location.lat,
      lng: location.lng,
      isOffice: true,
      locationName: RUDHRAM_OFFICE.name,
      distanceMeters: dist,
      address: `${RUDHRAM_OFFICE.name} (${dist}m away)`,
    };
  }

  let locationName = null;
  let fullAddress = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}&zoom=16&addressdetails=1`,
      {
        headers: { 'User-Agent': 'FaizalCRM/1.0', 'Accept-Language': 'en' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const parts = [
        addr.suburb || addr.neighbourhood || addr.county || addr.road,
        addr.city || addr.state_district || addr.town,
      ].filter(Boolean);
      locationName = parts.join(', ') || data.display_name?.split(',').slice(0, 2).join(',');
      fullAddress = data.display_name;
    }
  } catch (err) {
    // If geocode fails, fallback to coordinates
  }

  return {
    lat: location.lat,
    lng: location.lng,
    isOffice: false,
    locationName: locationName || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`,
    distanceMeters: dist,
    address: fullAddress || locationName,
  };
};
