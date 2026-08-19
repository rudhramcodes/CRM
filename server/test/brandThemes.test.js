import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BRAND_THEMES,
  DEFAULT_BRAND,
  getBrandTheme,
} from '../../client/src/constants/brandThemes.js';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const EXPECTED_BRANDS = [
  'aghori',
  'panigrahna',
  'house_of_joggi',
  'damrru',
  'tandavs',
  'kapaalik',
  'kalyannam',
  'storage_media_solution',
];

test('BRAND_THEMES has exactly the 8 supported brands', () => {
  assert.deepEqual(Object.keys(BRAND_THEMES).sort(), [...EXPECTED_BRANDS].sort());
});

test('every theme carries primary, accent1, accent2 and portalName', () => {
  for (const [brand, theme] of Object.entries(BRAND_THEMES)) {
    assert.ok(theme.primary, `${brand} is missing primary`);
    assert.ok(theme.accent1, `${brand} is missing accent1`);
    assert.ok(theme.accent2, `${brand} is missing accent2`);
    assert.ok(theme.portalName, `${brand} is missing portalName`);
  }
});

test('all hex values are 6-digit hex colors', () => {
  for (const [brand, theme] of Object.entries(BRAND_THEMES)) {
    assert.match(theme.primary, HEX_RE, `${brand}.primary`);
    assert.match(theme.accent1, HEX_RE, `${brand}.accent1`);
    assert.match(theme.accent2, HEX_RE, `${brand}.accent2`);
  }
});

test('getBrandTheme returns the matching theme for a known brand', () => {
  assert.equal(getBrandTheme('damrru'), BRAND_THEMES.damrru);
});

test('getBrandTheme falls back to the default brand for unknown brands', () => {
  assert.equal(getBrandTheme('unknown-brand'), BRAND_THEMES[DEFAULT_BRAND]);
  assert.equal(DEFAULT_BRAND, 'aghori');
});