export const getLocation = async () => {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return null;
  }

  let timeoutMs = 5000;
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' });
      if (status.state === 'prompt') {
        // First-time prompt: allow 10 seconds for user to click "Allow"
        timeoutMs = 10000;
      } else if (status.state === 'granted') {
        timeoutMs = 4000;
      }
    }
  } catch (e) {
    timeoutMs = 8000;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: timeoutMs, enableHighAccuracy: false, maximumAge: 60000 }
    );
  });
};

export default getLocation;
