import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { generateQuotationHtml } from './pdfService.js';
import ApiError from '../utils/ApiError.js';

const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'quotationArtifacts' });

export const readArtifact = async (id) => {
  const chunks = [];
  for await (const chunk of bucket().openDownloadStream(id)) chunks.push(chunk);
  return Buffer.concat(chunks);
};

export const removeArtifacts = async (artifacts) => {
  await Promise.all(Object.values(artifacts).map((id) => bucket().delete(id)));
};

const upload = async (name, bytes, metadata) => {
  const stream = bucket().openUploadStream(name, { metadata: {
    ...metadata, sha256: createHash('sha256').update(bytes).digest('hex'),
  } });
  try {
    await pipeline(Readable.from([bytes]), stream);
    return stream.id;
  } catch (error) {
    await stream.abort();
    throw error;
  }
};

// Paginate the current trusted renderer once, then remove scripts and render the PDF
// from precisely the HTML bytes returned here. Historical reads never invoke this.
export const renderFrozenArtifacts = async (content, version) => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    const captured = new Map();
    const responses = [];
    const failures = [];
    page.on('response', (response) => {
      if (!/^https?:/.test(response.url())) return;
      responses.push((async () => {
        if (!response.ok()) throw ApiError.badRequest('Required quotation asset could not be captured');
        const bytes = await response.buffer();
        const mime = response.headers()['content-type']?.split(';')[0] || 'application/octet-stream';
        captured.set(response.url(), `data:${mime};base64,${bytes.toString('base64')}`);
      })().catch((error) => { failures.push(error); }));
    });
    page.on('requestfailed', () => failures.push(ApiError.badRequest('Required quotation asset failed to load')));
    const html = generateQuotationHtml({ ...content, quotationNumber: `${content.quotationNumber} V${version}` });
    if (/url\(data:font\/[^;]+;base64,\)/.test(html)) throw ApiError.badRequest('Required quotation font is unavailable');
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    if (await page.evaluate(() => Boolean(window.__quotationPaginationPending))) {
      await page.waitForFunction('window.__quotationPaginationDone === true', { timeout: 10000 });
    }
    await Promise.all(responses);
    if (failures.length) throw failures[0];
    const frozen = await page.evaluate((assets) => {
      for (const image of document.images) {
        if (!image.complete || !image.naturalWidth) throw new Error('Required quotation image is unavailable');
      }
      document.querySelectorAll('script,iframe,object,embed').forEach((node) => node.remove());
      document.querySelectorAll('*').forEach((node) => {
        node.removeAttribute('contenteditable');
        for (const attribute of [...node.attributes]) {
          if (/^on/i.test(attribute.name)) node.removeAttribute(attribute.name);
        }
      });
      let result = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      for (const [url, data] of assets) result = result.split(url.replaceAll('&', '&amp;')).join(data).split(url).join(data);
      return result;
    }, [...captured]);
    // Refuse any unresolved resource reference rather than storing broken history.
    if (/(?:src\s*=\s*["']|url\(\s*["']?)(?:https?:|\/\/)/i.test(frozen) || /<link\b/i.test(frozen)) {
      throw ApiError.badRequest('Quotation contains an uncaptured required asset');
    }
    const pdfPage = await browser.newPage();
    await pdfPage.setJavaScriptEnabled(false);
    await pdfPage.setRequestInterception(true);
    pdfPage.on('request', (request) => {
      if (request.url().startsWith('data:') || request.url() === 'about:blank') void request.continue();
      else void request.abort();
    });
    await pdfPage.setContent(frozen, { waitUntil: 'load' });
    await pdfPage.bringToFront();
    await pdfPage.evaluate(() => document.fonts.ready);
    const pdf = Buffer.from(await pdfPage.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, waitForFonts: false }));
    return { html: Buffer.from(frozen), pdf };
  } finally {
    await browser.close();
  }
};

export const storeArtifacts = async (content, version, owner) => {
  const bytes = await renderFrozenArtifacts(content, version);
  const artifacts = {};
  try {
    artifacts.html = await upload(`${content.quotationNumber}-V${version}.html`, bytes.html, { ...owner, version, kind: 'html', contentType: 'text/html' });
    artifacts.pdf = await upload(`${content.quotationNumber}-V${version}.pdf`, bytes.pdf, { ...owner, version, kind: 'pdf', contentType: 'application/pdf' });
    return artifacts;
  } catch (error) {
    await removeArtifacts(artifacts);
    throw error;
  }
};
