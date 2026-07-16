import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { detectSource, getAdapter, resolveStoryPaths } from './sources.js';
import { getSettings } from './settings.js';
import * as state from './state.js';
import {
  upsertStoryMetadata,
  buildChapterFileList,
  importChapters as ngImportChapters,
  translateToHan,
  getDb,
} from '../ngoc-gian/lib.js';

function loadStoryInfo(outputDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(outputDir, '0_gioi_thieu.txt'), 'utf8'));
  } catch {
    return null;
  }
}

const STORAGE_BASE = path.join(fileURLToPath(new URL('.', import.meta.url)), '../thien-dao/storage');

function pathsForSlug(sourceId, storyUrl) {
  return resolveStoryPaths(sourceId, storyUrl);
}

/** Suy { sourceId, storyUrl, paths } cho 1 slug đã có sẵn trên đĩa (không cần gọi discover lại). */
function locateStory(slug) {
  const rt = state.getRuntime(slug);
  if (rt?.sourceId && rt?.sourceUrl) {
    return { sourceId: rt.sourceId, storyUrl: rt.sourceUrl, paths: pathsForSlug(rt.sourceId, rt.sourceUrl) };
  }

  const outputDir = path.join(STORAGE_BASE, slug);
  const info = loadStoryInfo(outputDir);
  if (!info?.story_source) return null;

  const sourceId = detectSource(info.story_source);
  if (!sourceId) return null;

  state.setSource(slug, sourceId, info.story_source);
  return { sourceId, storyUrl: info.story_source, paths: pathsForSlug(sourceId, info.story_source) };
}

// ─── Discover ─────────────────────────────────────────────────────────────────

export async function runDiscover(sourceId, url) {
  const adapter = getAdapter(sourceId);
  const paths = adapter.resolveStoryPaths(url);
  if (!paths) throw new Error('URL không hợp lệ');

  fs.mkdirSync(paths.outputDir, { recursive: true });
  state.setSource(paths.storySlug, sourceId, url);
  state.pushLog(paths.storySlug, `— Discover: đang quét ${url} —`);

  const result = await adapter.discover(paths);
  if (!result.ok) {
    state.pushLog(paths.storySlug, `✗ Discover thất bại (${result.reason})`);
    return { ok: false, slug: paths.storySlug, reason: result.reason };
  }

  state.pushLog(paths.storySlug, `— Discover: tìm thấy ${result.chapterCount} chương —`);

  // Best-effort: dịch Hán tự để hiển thị card, không chặn luồng nếu lỗi.
  translateToHan(result.storyInfo.story_name).then((han) => {
    if (han) state.setHan(paths.storySlug, han);
  }).catch(() => {});

  return { ok: true, slug: paths.storySlug, storyInfo: result.storyInfo, chapterCount: result.chapterCount };
}

// ─── Crawl ────────────────────────────────────────────────────────────────────

export async function runCrawl(slug, { from = 1, to = Infinity } = {}) {
  const located = locateStory(slug);
  if (!located) throw new Error(`Không xác định được nguồn cho truyện: ${slug}`);
  const { sourceId, paths } = located;

  const storyInfo = loadStoryInfo(paths.outputDir) || {};
  const adapter = getAdapter(sourceId);
  const { concurrency } = getSettings();

  state.setRunning(slug, { crawlRunning: true });
  state.pushLog(slug, `— Bắt đầu crawl (${from === 1 && to === Infinity ? 'toàn bộ' : `${from} → ${to === Infinity ? 'hết' : to}`}) —`);

  const onEvent = (evt) => {
    if (evt.type === 'success') state.pushLog(slug, `✓ Đã tải chương ${evt.num}: ${evt.title || ''}`.trim());
    else if (evt.type === 'skip') { /* bỏ qua log để tránh spam khi chạy lại toàn bộ */ }
    else if (evt.type === 'fail') state.pushLog(slug, `✗ Lỗi tải chương ${evt.num} (${evt.reason})`);
    state.emitProgress(slug);
  };

  let result;
  try {
    result = await adapter.crawlRange(paths, storyInfo, from, to, concurrency, onEvent);
  } finally {
    state.setRunning(slug, { crawlRunning: false });
  }

  state.pushLog(slug, `— Crawl hoàn tất: ${result.success} tải mới, ${result.skipped} bỏ qua, ${result.failed} thất bại —`);
  state.emitProgress(slug);

  const rt = state.getRuntime(slug);
  if (rt?.pendingFull) {
    await runImportChain(slug);
  }

  return result;
}

// ─── Import ───────────────────────────────────────────────────────────────────

async function ensureStoryId(slug, storyDir) {
  const info = loadStoryInfo(storyDir);
  if (!info) throw new Error(`Không tìm thấy 0_gioi_thieu.txt cho truyện: ${slug}`);
  const { dryRun } = getSettings();
  if (dryRun) return { storyId: null, info };

  state.pushLog(slug, '— Upsert metadata (tác giả/thể loại/truyện) —');
  const { storyId } = await upsertStoryMetadata(slug, info, undefined);
  return { storyId, info };
}

export async function runImport(slug, { from = 1, to = Infinity, storyOnly = false } = {}) {
  const located = locateStory(slug);
  if (!located) throw new Error(`Không xác định được nguồn cho truyện: ${slug}`);
  const { paths } = located;

  const { dryRun, concurrency } = getSettings();
  state.setRunning(slug, { importRunning: true });

  try {
    const { storyId } = await ensureStoryId(slug, paths.outputDir);
    if (storyOnly) {
      state.pushLog(slug, '— Đã upsert metadata, bỏ qua import chương (story-only) —');
      return { storyOnly: true, storyId };
    }

    const chapterFiles = buildChapterFileList(paths.outputDir, from, to);
    if (chapterFiles.length === 0) {
      state.pushLog(slug, 'Không có chương nào trong khoảng đã chọn để import.');
      return { success: 0, failed: 0 };
    }

    state.pushLog(slug, `— Bắt đầu import ${chapterFiles.length} chương —`);

    const onEvent = (evt) => {
      if (evt.type === 'success') {
        state.clearImportError(slug, evt.num);
        state.pushLog(slug, `✓ Đã import chương ${evt.num}: ${evt.title || ''}`.trim());
      } else if (evt.type === 'fail') {
        state.recordImportError(slug, evt.num);
        state.pushLog(slug, `✗ Lỗi import chương ${evt.num} (${evt.message || evt.reason})`);
      }
      state.emitProgress(slug);
    };

    const result = await ngImportChapters(chapterFiles, { storyId, storyDir: paths.outputDir, dry: dryRun, concurrency, onEvent });
    state.pushLog(slug, `— Import hoàn tất: ${result.success} thành công, ${result.failed} thất bại —`);
    state.emitProgress(slug);
    return result;
  } finally {
    state.setRunning(slug, { importRunning: false });
  }
}

/**
 * Số chương đã import (is_published) cho slug này, dùng để chỉ import phần mới
 * crawl thêm thay vì import lại toàn bộ mỗi lần chạy "Full" trên truyện đã có
 * sẵn đa số chương trong Supabase. Trả 0 nếu chưa có story hoặc không đọc được.
 */
async function getAlreadyImportedCount(slug) {
  try {
    const db = getDb();
    const { data: story } = await db.from('stories').select('id').eq('slug', slug).maybeSingle();
    if (!story) return 0;
    const { count } = await db.from('chapters')
      .select('id', { count: 'exact', head: true })
      .eq('story_id', story.id).eq('is_published', true);
    return count || 0;
  } catch {
    return 0;
  }
}

async function runImportChain(slug) {
  state.setRunning(slug, { pendingFull: false });
  const { dryRun } = getSettings();
  const already = dryRun ? 0 : await getAlreadyImportedCount(slug);
  await runImport(slug, { from: already + 1, to: Infinity, storyOnly: false });
}

// ─── Full pipeline: discover → crawl → import ────────────────────────────────

export async function runFull(sourceId, url) {
  const discoverResult = await runDiscover(sourceId, url);
  if (!discoverResult.ok) return discoverResult;

  const { slug } = discoverResult;
  state.setRunning(slug, { pendingFull: true });

  // Chạy nền — không await để trả lời API ngay, tiến độ theo dõi qua SSE.
  runCrawl(slug, { from: 1, to: Infinity }).catch((err) => {
    state.pushLog(slug, `✗ Lỗi pipeline: ${err.message}`);
    state.setRunning(slug, { crawlRunning: false, importRunning: false, pendingFull: false });
  });

  return { ok: true, slug };
}

// ─── Retry ────────────────────────────────────────────────────────────────────

export async function retryChapter(slug, { type, chapter }) {
  if (type === 'crawl') return runCrawl(slug, { from: chapter, to: chapter });
  if (type === 'import') return runImport(slug, { from: chapter, to: chapter });
  throw new Error(`Loại retry không hợp lệ: ${type}`);
}

export async function retryAll(slug) {
  const located = locateStory(slug);
  if (!located) throw new Error(`Không xác định được nguồn cho truyện: ${slug}`);

  const errorFile = path.join(located.paths.outputDir, '.cache-error.json');
  let crawlErrors = [];
  try {
    const errorCache = JSON.parse(fs.readFileSync(errorFile, 'utf8'));
    crawlErrors = errorCache.download_failed || [];
  } catch { /* không có file lỗi */ }

  const importErrors = [...(state.getRuntime(slug)?.importErrors || [])];

  state.pushLog(slug, `— Retry tất cả ${crawlErrors.length + importErrors.length} chương lỗi —`);

  for (const num of crawlErrors) {
    await runCrawl(slug, { from: num, to: num });
  }
  for (const num of importErrors) {
    await runImport(slug, { from: num, to: num });
  }

  return { retried: crawlErrors.length + importErrors.length };
}

export { locateStory };
