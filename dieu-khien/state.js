import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';
import { getDb } from '../ngoc-gian/lib.js';
import { detectSource } from './sources.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_BASE = path.join(__dirname, '../thien-dao/storage');

const MAX_LOGS = 200;

/** @type {Map<string, object>} slug -> runtime state (chỉ tồn tại trong phiên chạy hiện tại của server) */
const runtimes = new Map();

/** 1 emitter dùng chung, event name = slug, payload = { type, ...} */
export const bus = new EventEmitter();
bus.setMaxListeners(100);

function ensureRuntime(slug) {
  let rt = runtimes.get(slug);
  if (!rt) {
    rt = {
      slug,
      sourceId: null,
      sourceUrl: null,
      han: null,
      crawlRunning: false,
      importRunning: false,
      pendingFull: false,
      logs: [],
      importErrors: new Set(), // số chương import lỗi trong phiên hiện tại (không persist)
    };
    runtimes.set(slug, rt);
  }
  return rt;
}

export function getRuntime(slug) {
  return runtimes.get(slug) || null;
}

export function pushLog(slug, text) {
  const rt = ensureRuntime(slug);
  const line = { ts: Date.now(), text };
  rt.logs.push(line);
  if (rt.logs.length > MAX_LOGS) rt.logs.splice(0, rt.logs.length - MAX_LOGS);
  bus.emit(slug, { type: 'log', line });
}

export function setRunning(slug, patch) {
  const rt = ensureRuntime(slug);
  Object.assign(rt, patch);
  bus.emit(slug, { type: 'state', patch });
}

export function setSource(slug, sourceId, sourceUrl) {
  const rt = ensureRuntime(slug);
  rt.sourceId = sourceId;
  rt.sourceUrl = sourceUrl;
}

export function setHan(slug, han) {
  const rt = ensureRuntime(slug);
  rt.han = han;
}

export function recordImportError(slug, num) {
  ensureRuntime(slug).importErrors.add(num);
  bus.emit(slug, { type: 'progress' });
}

export function clearImportError(slug, num) {
  ensureRuntime(slug).importErrors.delete(num);
}

export function clearAllImportErrors(slug) {
  ensureRuntime(slug).importErrors.clear();
}

export function emitProgress(slug) {
  bus.emit(slug, { type: 'progress' });
}

// ─── Quét thien-dao/storage/* để suy danh sách truyện + tiến độ crawl ───────

function loadJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function buildLocalStoryRecord(slug) {
  const dir = path.join(STORAGE_BASE, slug);
  if (!fs.existsSync(dir)) return null;

  const info = loadJsonSafe(path.join(dir, '0_gioi_thieu.txt')) || {};
  const cache = loadJsonSafe(path.join(dir, '.cache.json')) || {};
  const errorCache = loadJsonSafe(path.join(dir, '.cache-error.json')) || {};

  const cacheCount = Object.keys(cache).length;
  const totalFromInfo = parseInt(info.total_num_chapters, 10) || 0;
  const crawlTotal = cacheCount || totalFromInfo;

  const crawlDone = fs.readdirSync(dir)
    .filter((f) => /^\d+_chuong_\d+\.txt$/.test(f)).length;

  const crawlErrors = (errorCache.download_failed || []).slice();

  const sourceId = detectSource(info.story_source) || null;
  const rt = getRuntime(slug);

  return {
    slug,
    title: info.story_name || slug,
    han: rt?.han || null,
    sourceId,
    sourceUrl: info.story_source || rt?.sourceUrl || null,
    status: info.story_status || null,
    crawl: { done: Math.min(crawlDone, crawlTotal || crawlDone), total: crawlTotal, errors: crawlErrors },
    crawlRunning: !!rt?.crawlRunning,
    importRunning: !!rt?.importRunning,
    pendingFull: !!rt?.pendingFull,
    logs: rt?.logs || [],
    importErrors: rt ? [...rt.importErrors] : [],
  };
}

export function scanLocalStories() {
  if (!fs.existsSync(STORAGE_BASE)) return [];

  const slugs = fs.readdirSync(STORAGE_BASE, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  return slugs.map(buildLocalStoryRecord).filter(Boolean);
}

/** Giống scanLocalStories nhưng chỉ quét 1 thư mục — dùng cho SSE/single-story
 * lookup để tránh phải liệt kê + đọc toàn bộ thien-dao/storage mỗi lần. */
export function scanLocalStory(slug) {
  return buildLocalStoryRecord(slug);
}

// ─── Bổ sung tiến độ import từ Supabase ──────────────────────────────────────

export async function enrichWithSupabase(records) {
  if (records.length === 0) return records;

  let db;
  try {
    db = getDb();
  } catch {
    return records.map((r) => ({ ...r, import: { done: 0, total: r.crawl.total, storyId: null } }));
  }

  const slugs = records.map((r) => r.slug);
  const { data: storyRows } = await db.from('stories').select('id, slug').in('slug', slugs);
  const bySlug = new Map((storyRows || []).map((s) => [s.slug, s]));

  const counts = await Promise.all(
    (storyRows || []).map(async (s) => {
      const { count } = await db.from('chapters')
        .select('id', { count: 'exact', head: true })
        .eq('story_id', s.id).eq('is_published', true);
      return [s.id, count || 0];
    })
  );
  const doneByStoryId = new Map(counts);

  return records.map((r) => {
    const story = bySlug.get(r.slug);
    const done = story ? (doneByStoryId.get(story.id) || 0) : 0;
    return {
      ...r,
      import: { done, total: r.crawl.total, storyId: story?.id || null },
    };
  });
}
