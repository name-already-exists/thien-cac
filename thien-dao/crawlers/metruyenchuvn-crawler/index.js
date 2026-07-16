#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  loadCache,
  resolveStoryPaths,
  discoverStory,
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
Crawler truyện từ metruyenchuvn.com
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
  node index.js https://metruyenchuvn.com/tien-nghich --discover
  node index.js https://metruyenchuvn.com/tien-nghich --from 1 --to 494
  node index.js https://metruyenchuvn.com/tien-nghich --from 495 --to 988
  node index.js https://metruyenchuvn.com/tien-nghich --chapter 50

Lưu ý:
  - Dữ liệu lưu tại:  thien-dao/storage/<slug>/
  - Cache URL chương: thien-dao/storage/<slug>/.cache.json
  - Chạy lại bước 2 → bỏ qua file đã tải
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  if (!args.url) { printHelp(); process.exit(0); }

  const paths = resolveStoryPaths(args.url);
  if (!paths) {
    console.error('URL không hợp lệ. Ví dụ: https://metruyenchuvn.com/tien-nghich');
    process.exit(1);
  }
  const { storySlug, storyUrl, outputDir, cacheFile } = paths;

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\nTruyện  : ${storySlug}`);
  console.log(`Lưu tại : ${outputDir}`);
  console.log('─'.repeat(52));

  // ══════════════════════════════════════════════════════════
  // BƯỚC 1: Discovery — lấy toàn bộ cache URL chương
  // ══════════════════════════════════════════════════════════
  if (args.discover) {
    const result = await discoverStory(storyUrl, storySlug, outputDir, cacheFile);
    if (!result.ok) process.exit(1);
    return;
  }

  // ══════════════════════════════════════════════════════════
  // BƯỚC 2: Download — tải chương từ cache có sẵn
  // ══════════════════════════════════════════════════════════
  const known = loadCache(cacheFile);
  if (Object.keys(known).length === 0) {
    console.error('Cache trống. Chạy bước 1 trước:\n  node index.js <url> --discover');
    process.exit(1);
  }
  console.log(`Cache   : ${Object.keys(known).length} chương`);

  const introFile = path.join(outputDir, '0_gioi_thieu.txt');
  let storyInfo = {};
  if (fs.existsSync(introFile)) {
    storyInfo = JSON.parse(fs.readFileSync(introFile, 'utf8'));
    console.log(`Thông tin: ${storyInfo.story_name}`);
  }

  // ── Xác định khoảng chương cần tải ───────────────────────
  let fromChapter = args.from ?? 1;
  let toChapter = args.to ?? Infinity;
  if (args.chapter !== null) { fromChapter = args.chapter; toChapter = args.chapter; }

  const errorFile = path.join(outputDir, '.cache-error.json');
  const errorCache = loadCache(errorFile); // { site_gaps: [], download_failed: [] }

  const { downloadList, siteGaps, downloadFailed } = buildDownloadList(known, storyInfo, fromChapter, toChapter, errorCache);

  if (downloadList.length === 0) {
    console.log('\nKhông tìm thấy chương nào trong khoảng đã chọn.');
    process.exit(0);
  }

  console.log(`\nBắt đầu tải ${downloadList.length} chương...\n`);

  const { success, skipped, failed } = await downloadChapters(downloadList, { known, outputDir, downloadFailed, concurrency: 1 });

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
