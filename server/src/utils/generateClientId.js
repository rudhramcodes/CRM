import Client from '../modules/clients/client.model.js';
import { VENTURE_CODES } from '../constants/index.js';

const generateClientId = async (brand) => {
  const ventureCode = VENTURE_CODES[brand];
  if (!ventureCode) {
    throw new Error(`Invalid brand: ${brand}. No venture code mapped.`);
  }

  const year = new Date().getFullYear().toString();
  const prefix = `RE-${ventureCode}-${year}-`;

  const last = await Client.findOne({ clientId: { $regex: `^${prefix}` } })
    .sort({ clientId: -1 })
    .select('clientId')
    .lean();

  let seq = 1;
  if (last?.clientId) {
    const lastSeq = parseInt(last.clientId.split('-').pop(), 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(3, '0')}`;
};

export default generateClientId;
