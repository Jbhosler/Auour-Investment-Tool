/**
 * Composes the Ultra Low Duration proposal HTML and prints it to PDF.
 * Page order matches the approved kit: cover, front library pages,
 * executive summary, performance, risk, then back library pages.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nunjucks from 'nunjucks';
import uldReference from './data_proposal.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const GENERATED = ['exec-summary.html', 'performance.html', 'risk.html'];

const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader([path.join(ROOT, 'templates'), ROOT]),
  { autoescape: false }
);

const themeCss = fs.readFileSync(path.join(ROOT, 'theme.css'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'library', 'manifest.json'), 'utf8'));
const staticAssetCache = new Map();

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function makeAssetResolver(assetDirs) {
  return function asset(name) {
    if (!name) return '';
    if (name.startsWith('http://') || name.startsWith('https://') || name.startsWith('data:')) {
      return name;
    }
    if (staticAssetCache.has(name)) return staticAssetCache.get(name);
    for (const dir of assetDirs) {
      const filePath = path.join(dir, name);
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const mime = ext === '.png' ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
          : ext === '.svg' ? 'image/svg+xml'
          : 'application/octet-stream';
        const encoded = fs.readFileSync(filePath).toString('base64');
        const dataUri = `data:${mime};base64,${encoded}`;
        staticAssetCache.set(name, dataUri);
        return dataUri;
      }
    }
    throw new Error(`asset not found: ${name}`);
  };
}

function selectLibraryPages(manifest, strategyKey, slot, overrides = {}) {
  const include = new Set(overrides.include || []);
  const exclude = new Set(overrides.exclude || []);
  return manifest.pages
    .filter((page) => page.slot === slot)
    .filter((page) => !exclude.has(page.id))
    .filter((page) => {
      const applies = page.strategies.includes('*') || page.strategies.includes(strategyKey);
      return (page.enabled !== false && applies) || include.has(page.id);
    })
    .sort((a, b) => a.order - b.order);
}

function buildPageList(data, manifest) {
  const strategy = data.portfolio.strategy_key;
  const overrides = data.library_overrides || {};
  const pages = [{ kind: 'generated', template: 'cover.html' }];
  for (const meta of selectLibraryPages(manifest, strategy, 'front', overrides)) {
    pages.push({ kind: 'library', meta });
  }
  for (const template of GENERATED) {
    pages.push({ kind: 'generated', template });
  }
  for (const meta of selectLibraryPages(manifest, strategy, 'back', overrides)) {
    pages.push({ kind: 'library', meta });
  }
  return pages;
}

function withDrawdownRows(data) {
  const risk = data.risk || {};
  if (Array.isArray(risk.drawdownRows) || !risk.drawdowns) return data;
  const portfolio = risk.drawdowns.portfolio || [];
  const benchmark = risk.drawdowns.benchmark || [];
  const count = Math.max(portfolio.length, benchmark.length);
  const drawdownRows = [];
  for (let i = 0; i < count; i += 1) {
    drawdownRows.push({
      portfolio: portfolio[i]?.value ?? '',
      portfolioDates: portfolio[i]?.dates ?? '',
      benchmark: benchmark[i]?.value ?? '',
      benchmarkDates: benchmark[i]?.dates ?? '',
    });
  }
  return { ...data, risk: { ...risk, drawdownRows } };
}

function escapePayload(value, keyPath) {
  if (typeof value === 'string') {
    if (value.startsWith('data:') || keyPath === 'firm' || keyPath.startsWith('firm.')) return value;
    return escapeHtml(value);
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => escapePayload(item, `${keyPath}[${index}]`));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      const nextPath = keyPath ? `${keyPath}.${key}` : key;
      out[key] = escapePayload(child, nextPath);
    }
    return out;
  }
  return value;
}

function requireScenarioCharts(payload) {
  const charts = [
    ['growth chart', payload?.charts?.growth],
    ['histogram', payload?.charts?.histogram],
    ['strategy allocation chart', payload?.allocation_charts?.[0]?.image],
    ['category allocation chart', payload?.allocation_charts?.[1]?.image],
  ];
  for (const [label, image] of charts) {
    if (typeof image !== 'string' || !image.startsWith('data:')) {
      const error = new Error(`Missing ${label} from the proposal engine`);
      error.statusCode = 400;
      throw error;
    }
  }
  if (!payload?.portfolio?.strategy_key || !payload?.performance || !payload?.risk) {
    const error = new Error('Incomplete proposal payload');
    error.statusCode = 400;
    throw error;
  }
}

export function renderUldHtml(payload) {
  requireScenarioCharts(payload);
  const data = withDrawdownRows({
    ...escapePayload(payload, ''),
    reference: uldReference,
  });
  const asset = makeAssetResolver([path.join(ROOT, 'assets')]);
  const htmlPages = [];
  let number = 0;

  for (const entry of buildPageList(data, manifest)) {
    number += 1;
    const ctx = {
      ...data,
      page_number: number === 1 ? '' : number,
      asset,
    };

    if (entry.kind === 'generated') {
      htmlPages.push(env.render(entry.template, ctx));
    } else {
      const meta = {
        ...entry.meta,
        title: env.renderString(entry.meta.title || '', ctx),
        subtitle: env.renderString(entry.meta.subtitle || '', ctx),
        footnote: env.renderString(entry.meta.footnote || '', ctx),
      };
      htmlPages.push(env.render('_library_page.html', { ...ctx, meta }));
    }
  }

  const title = `${data.client?.name || 'Client'} - Investment Proposal`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${themeCss}</style></head><body>${htmlPages.join('')}</body></html>`;
}

function chromiumPath() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  if (process.platform === 'win32') {
    const candidates = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
  }
  return '/usr/bin/chromium';
}

let browserPromise = null;
let renderQueue = Promise.resolve();

function launchBrowser() {
  if (!browserPromise) {
    browserPromise = import('puppeteer-core').then(async (puppeteer) => {
      const browser = await puppeteer.default.launch({
        executablePath: chromiumPath(),
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      browser.on('disconnected', () => {
        browserPromise = null;
      });
      return browser;
    }).catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

async function printHtml(html) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const pdf = await page.pdf({
      width: '8.5in',
      height: '11in',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close();
  }
}

export function renderUldPdf(payload) {
  const html = renderUldHtml(payload);
  const job = renderQueue.then(() => printHtml(html));
  renderQueue = job.then(() => undefined, () => undefined);
  return job;
}
