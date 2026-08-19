export const BRAND_THEMES = {
  aghori: {
    primary: '#002e62',
    accent1: '#e73228',
    accent2: '#ffe400',
    portalName: 'Aghori',
    tagline: 'Craft with intent, track with clarity',
    logoEmoji: '🖤',
  },
  panigrahna: {
    primary: '#B37839',
    accent1: '#FBF4EC',
    accent2: '#F7EAD8',
    portalName: 'Panigrahna',
    tagline: 'Your projects, one elegant view',
    logoEmoji: '🏵️',
  },
  house_of_joggi: {
    primary: '#3E2723',
    accent1: '#B8860B',
    accent2: '#FBF6EF',
    portalName: 'House of Joggi',
    tagline: 'Every creation, beautifully tracked',
    logoEmoji: '🏠',
  },
  damrru: {
    primary: '#C1440E',
    accent1: '#FFD54F',
    accent2: '#FFF8E7',
    portalName: 'Damrru',
    tagline: 'Progress in vivid detail',
    logoEmoji: '🥁',
  },
  tandavs: {
    primary: '#1A1A2E',
    accent1: '#E94560',
    accent2: '#0F3460',
    portalName: 'Tandavs',
    tagline: 'Bold work, transparent delivery',
    logoEmoji: '🔥',
  },
  kapaalik: {
    primary: '#2D1B2E',
    accent1: '#C84B31',
    accent2: '#F2E8E6',
    portalName: 'Kapaalik',
    tagline: 'Your brand, our shared canvas',
    logoEmoji: '💀',
  },
  kalyannam: {
    primary: '#1F6B4E',
    accent1: '#D4A017',
    accent2: '#F4F9F6',
    portalName: 'Kalyannam',
    tagline: 'Good work, clearly in motion',
    logoEmoji: '🌿',
  },
  storage_media_solution: {
    primary: '#0B4F6C',
    accent1: '#21A0A0',
    accent2: '#F0F7F9',
    portalName: 'Storage Media Solution',
    tagline: 'Your media projects, in sync',
    logoEmoji: '💾',
  },
};

export const DEFAULT_BRAND = 'aghori';

export const getBrandTheme = (brand) => BRAND_THEMES[brand] || BRAND_THEMES[DEFAULT_BRAND];