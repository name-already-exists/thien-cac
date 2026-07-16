#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  loadCache,
  resolveStoryPaths,
  fetchStoryMeta,
  discoverStory,
  ensureChaptersKnown,
  buildDownloadList,
  downloadChapters,
  finalizeErrorFile,
} = require('./lib');

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { url: null, from: null, to: null, chapter: null, discover: false };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if      (a === '--from'    && args[i + 1]) result.from     = parseInt(args[++i], 10);
    else if (a === '--to'      && args[i + 1]) result.to       = parseInt(args[++i], 10);
    else if (a === '--chapter' && args[i + 1]) result.chapter  = parseInt(args[++i], 10);
    else if (a === '--discover')               result.discover  = true;
    else if (!a.startsWith('-'))               result.url       = a;
  }

  return result;
}

function printHelp() {
  console.log(`
Crawler truyện từ khotruyenchu.fun
────────────────────────────────────────────────────
Bước 1 — lấy cache URL chương:
  node index.js <story-url> --discover

Bước 2 — tải chương (cần chạy --discover trước):
  node index.js <story-url> [options]

Options (bước 2):
  --from N      Tải từ chương N trở đi
  --to N        Tải đến chương N (bao gồm)
  --chapter N   Chỉ tải đúng chương N

Ví dụ:
  node index.js https://khotruyenchu.fun/truyen/tien-nghich/ --discover
  node index.js https://khotruyenchu.fun/truyen/tien-nghich/ --from 1 --to 100
  node index.js https://khotruyenchu.fun/truyen/tien-nghich/ --from 101 --to 200
  node index.js https://khotruyenchu.fun/truyen/tien-nghich/ --chapter 50

Lưu ý:
  - Dữ liệu lưu tại:  thien-dao/<slug>/
  - Cache URL chương: thien-dao/<slug>/.cache.json
  - Chạy lại bước 2 → bỏ qua file đã tải
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  if (!args.url) { printHelp(); process.exit(0); }

  const paths = resolveStoryPaths(args.url);
  if (!paths) {
    console.error('URL không hợp lệ. Ví dụ: https://khotruyenchu.fun/truyen/tien-nghich/');
    process.exit(1);
  }
  const { storySlug, storyUrl, outputDir, cacheFile } = paths;

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\nTruyện  : ${storySlug}`);
  console.log(`Lưu tại : ${outputDir}`);
  console.log('─'.repeat(52));

  // ── 1. Story metadata ─────────────────────────────────────
  const meta = await fetchStoryMeta(storyUrl, outputDir);
  if (!meta.ok) process.exit(1);
  const { totalPages } = meta;

  // ══════════════════════════════════════════════════════════
  // BƯỚC 1: Discovery — lấy toàn bộ cache URL chương
  // ══════════════════════════════════════════════════════════
  if (args.discover) {
    await discoverStory(storySlug, totalPages, cacheFile);
    return;
  }

  // ── 2. Xác định khoảng chương cần tải ────────────────────
  let fromChapter = args.from ?? 1;
  let toChapter = args.to ?? Infinity;
  if (args.chapter !== null) { fromChapter = args.chapter; toChapter = args.chapter; }

  const rangeLabel = toChapter === Infinity ? `${fromChapter} → hết` : `${fromChapter} → ${toChapter}`;
  console.log(`Khoảng  : ${rangeLabel}`);

  // ── 3. Khám phá URL chương (tự bổ sung nếu cache chưa đủ) ─
  const known = await ensureChaptersKnown(storySlug, totalPages, cacheFile, fromChapter, toChapter);

  // ── 4. Danh sách chương cần download ─────────────────────
  const errorFile = path.join(outputDir, '.cache-error.json');
  const errorCache = loadCache(errorFile);

  const { downloadList, siteGaps, downloadFailed } = buildDownloadList(known, fromChapter, toChapter, errorCache);

  if (downloadList.length === 0) {
    console.log('\nKhông tìm thấy chương nào trong khoảng đã chọn.');
    process.exit(0);
  }

  console.log(`\nBắt đầu tải ${downloadList.length} chương...\n`);

  // ── 5. Download ───────────────────────────────────────────
  const { success, skipped, failed } = await downloadChapters(downloadList, { known, outputDir, downloadFailed, concurrency: 1 });

  // ── 6. Ghi file lỗi ──────────────────────────────────────
  const { gapsArr, failedArr } = finalizeErrorFile(errorFile, siteGaps, downloadFailed);
  if (gapsArr.length > 0) console.log(`\nSite gaps  : ${gapsArr.length} chương site bỏ qua (${gapsArr.slice(0, 5).join(', ')}${gapsArr.length > 5 ? '...' : ''})`);
  if (failedArr.length > 0) console.log(`Tải lỗi    : ${failedArr.length} chương → ${path.basename(errorFile)}`);

  console.log('\n' + '─'.repeat(52));
  console.log(`Hoàn thành: ${success} tải mới | ${skipped} bỏ qua | ${failed} thất bại`);
  console.log(`Thư mục: ${outputDir}`);
}

main().catch((err) => {
  console.error('\nLỗi:', err.message);
  process.exit(1);
});
