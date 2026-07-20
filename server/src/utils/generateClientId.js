import Client from '../modules/clients/client.model.js';
import { VENTURE_CODES } from '../constants/index.js';

/**
 * Generate a unique client ID in format: RE-{VENTURE}-{YEAR}-{SEQ}
 *
 * Example: RE-PG-2026-001
 *
 * - RE: Rudhram (fixed)
 * - VENTURE: 2-letter venture code (PG, AG, HG, DM, TD, KL, KP, SM)
 * - YEAR: Current year
 * - SEQ: Global sequential counter (001, 002, 003...)
 */
const generateClientId = async (brand) => {
  const ventureCode = VENTURE_CODES[brand];
  if (!ventureCode) {
    throw new Error(`Invalid brand: ${brand}. No venture code mapped.`);
  }

  const year = new Date().getFullYear().toString();

  // Count all existing clients for global sequencing
  const totalClients = await Client.countDocuments({});

  const seq = String(totalClients + 1).padStart(3, '0');

  return `RE-${ventureCode}-${year}-${seq}`;
};

export default generateClientId;
