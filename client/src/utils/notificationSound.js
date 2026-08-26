const STORAGE_KEY = 'notificationSoundEnabled';
let audio = null;
let isPrimed = false;

export const isNotificationSoundEnabled = () => {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) !== 'false';
};

export const setNotificationSoundEnabled = (enabled) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  }
};

const getAudio = () => {
  if (typeof window === 'undefined') return null;
  if (!audio) {
    audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.7;
    audio.preload = 'auto';
    audio.load();
  }
  return audio;
};

export const primeNotificationSound = async () => {
  if (typeof window === 'undefined') return;
  const a = getAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
    await a.play();
    isPrimed = true;
    a.pause();
    a.currentTime = 0;
  } catch (e) {
    console.warn('Could not prime notification sound:', e);
  }
};

export const playNotificationSound = async () => {
  if (!isNotificationSoundEnabled()) return;
  if (typeof window === 'undefined') return;
  const a = getAudio();
  if (!a) return;
  try {
    a.currentTime = 0;
    await a.play();
  } catch (e) {
    console.warn('Could not play notification sound:', e);
    if (!isPrimed) {
      try {
        await a.load();
        a.currentTime = 0;
        await a.play();
        isPrimed = true;
      } catch (e2) {
        console.error('Notification sound failed after retry:', e2);
      }
    }
  }
};
