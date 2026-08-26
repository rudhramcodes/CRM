const STORAGE_KEY = 'notificationSoundEnabled';
let audioContext;

export const isNotificationSoundEnabled = () => {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(STORAGE_KEY) !== 'false';
};

export const setNotificationSoundEnabled = (enabled) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, String(enabled));
  }
};

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  audioContext ||= new AudioContext();
  return audioContext;
};

export const primeNotificationSound = async () => {
  const context = getAudioContext();
  if (context?.state === 'suspended') {
    try { await context.resume(); } catch { /* Browser may still require a gesture. */ }
  }
};

export const playNotificationSound = async () => {
  if (!isNotificationSoundEnabled()) return;
  const context = getAudioContext();
  if (!context) return;
  try {
    await primeNotificationSound();
    if (context.state !== 'running') return;
    const now = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    gain.connect(context.destination);

    const first = context.createOscillator();
    first.type = 'sine';
    first.frequency.setValueAtTime(880, now);
    first.frequency.exponentialRampToValueAtTime(1174.66, now + 0.16);
    first.connect(gain);
    first.start(now);
    first.stop(now + 0.22);

    const second = context.createOscillator();
    second.type = 'sine';
    second.frequency.setValueAtTime(1174.66, now + 0.13);
    second.connect(gain);
    second.start(now + 0.13);
    second.stop(now + 0.42);
  } catch {
    // Sound is a progressive enhancement; notification delivery must still work.
  }
};
