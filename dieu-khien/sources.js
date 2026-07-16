import path from 'path';
import { fileURLToPath } from 'url';

import metruyenchuvnLib from '../thien-dao/crawlers/metruyenchuvn-crawler/lib.js';
import truyenyyLib from '../thien-dao/crawlers/truyenyy-crawler/lib.js';
import khotruyenchuLib from '../thien-dao/crawlers/khotruyenchu-crawler/lib.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCES = {
  metruyenchuvn: { label: 'MeTruyenChuVN', domain: /metruyenchuvn\.com/i },
  truyenyy:      { label: 'TruyenYY',      domain: /truyenyy\.co/i },
  khotruyenchu:  { label: 'KhoTruyenChu',  domain: /khotruyenchu\.fun/i },
};

export function detectSource(url) {
  if (!url) return null;
  for (const [id, s] of Object.entries(SOURCES)) {
    if (s.domain.test(url)) return id;
  }
  return null;
}

export function sourceLabel(id) {
  return SOURCES[id]?.label || id || 'Không rõ';
}

export function listSourceIds() {
  return Object.keys(SOURCES);
}

// ─── Generic adapter (metruyenchuvn / truyenyy) — cùng interface lib.js ──────

function makeGenericAdapter(lib) {
  return {
    lib,
    resolveStoryPaths: (url) => lib.resolveStoryPaths(url),

    async discover(paths) {
      return lib.discoverStory(paths.storyUrl, paths.storySlug, paths.outputDir, paths.cacheFile);
    },

    async crawlRange(paths, storyInfo, from, to, concurrency, onEvent) {
      const known = lib.loadCache(paths.cacheFile);
      const errorFile = path.join(paths.outputDir, '.cache-error.json');
      const errorCache = lib.loadCache(errorFile);
      const { downloadList, siteGaps, downloadFailed } = lib.buildDownloadList(known, storyInfo, from, to, errorCache);

      if (downloadList.length === 0) {
        return { success: 0, skipped: 0, failed: 0, gapsCount: siteGaps.size, failedCount: downloadFailed.size, attempted: 0 };
      }

      const { success, skipped, failed } = await lib.downloadChapters(downloadList, {
        known, outputDir: paths.outputDir, downloadFailed, concurrency, onEvent,
      });
      const { gapsArr, failedArr } = lib.finalizeErrorFile(errorFile, siteGaps, downloadFailed);

      return { success, skipped, failed, gapsCount: gapsArr.length, failedCount: failedArr.length, attempted: downloadList.length };
    },
  };
}

// ─── KhoTruyenChu adapter — luôn fetch lại story meta trước mỗi thao tác ─────
// (đúng hành vi CLI gốc: main() luôn gọi fetchStoryMeta trước khi rẽ nhánh discover/download)

function makeKhotruyenchuAdapter(lib) {
  return {
    lib,
    resolveStoryPaths: (url) => lib.resolveStoryPaths(url),

    async discover(paths) {
      const meta = await lib.fetchStoryMeta(paths.storyUrl, paths.outputDir);
      if (!meta.ok) return meta;
      const result = await lib.discoverStory(paths.storySlug, meta.totalPages, paths.cacheFile);
      return { ok: true, storyInfo: meta.storyInfo, chapterCount: result.chapterCount };
    },

    async crawlRange(paths, storyInfo, from, to, concurrency, onEvent) {
      const meta = await lib.fetchStoryMeta(paths.storyUrl, paths.outputDir);
      if (!meta.ok) {
        return { success: 0, skipped: 0, failed: 0, gapsCount: 0, failedCount: 0, attempted: 0, error: meta.reason };
      }

      const known = await lib.ensureChaptersKnown(paths.storySlug, meta.totalPages, paths.cacheFile, from, to);
      const errorFile = path.join(paths.outputDir, '.cache-error.json');
      const errorCache = lib.loadCache(errorFile);
      const { downloadList, siteGaps, downloadFailed } = lib.buildDownloadList(known, from, to, errorCache);

      if (downloadList.length === 0) {
        return { success: 0, skipped: 0, failed: 0, gapsCount: siteGaps.size, failedCount: downloadFailed.size, attempted: 0 };
      }

      const { success, skipped, failed } = await lib.downloadChapters(downloadList, {
        known, outputDir: paths.outputDir, downloadFailed, concurrency, onEvent,
      });
      const { gapsArr, failedArr } = lib.finalizeErrorFile(errorFile, siteGaps, downloadFailed);

      return { success, skipped, failed, gapsCount: gapsArr.length, failedCount: failedArr.length, attempted: downloadList.length };
    },
  };
}

const ADAPTERS = {
  metruyenchuvn: makeGenericAdapter(metruyenchuvnLib),
  truyenyy: makeGenericAdapter(truyenyyLib),
  khotruyenchu: makeKhotruyenchuAdapter(khotruyenchuLib),
};

export function getAdapter(sourceId) {
  const adapter = ADAPTERS[sourceId];
  if (!adapter) throw new Error(`Không nhận diện được nguồn: ${sourceId}`);
  return adapter;
}

export function resolveStoryPaths(sourceId, url) {
  return getAdapter(sourceId).resolveStoryPaths(url);
}
