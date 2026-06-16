#!/usr/bin/env node
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = 'https://khotruyenchu.fun';
const DELAY_MS = 1200;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 3000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  'Referer': BASE_URL,
};

// Output directory: two levels up → thien-dao/
const OUTPUT_BASE = path.join(__dirname, '../..');

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url) {
  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: HEADERS,
        responseType: 'arraybuffer',
        timeout: 20000,
      });
      return res.data.toString('utf8');
    } catch (err) {
      const isLast = attempt === RETRY_COUNT;
      process.stdout.write(isLast ? ` [Lỗi: ${err.message}]\n` : ` [Thử ${attempt}/${RETRY_COUNT}]`);
      if (!isLast) await sleep(RETRY_DELAY_MS);
    }
  }
  return null;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function loadCache(cacheFile) {
  try {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cacheFile, data) {
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), 'utf8');
}

// ─── Story page parsers ───────────────────────────────────────────────────────

function extractStorySlug(url) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    const m = u.pathname.match(/\/truyen\/([^/]+)\/?/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function parseStoryInfo(html, storyUrl) {
  const $ = cheerio.load(html);

  const title = $('.truyen-title').first().text().trim();
  const author = $('.truyen-meta a[href*="tac-gia"]').first().text().trim();

  const genre = $('.truyen-meta a[href*="the-loai"]')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join(', ');

  let status = '';
  $('.truyen-meta span').each((_, el) => {
    const text = $(el).text();
    if (text.includes('Tình trạng')) {
      status = text.replace(/.*Tình trạng\s*:?\s*/i, '').trim();
      return false;
    }
  });

  let totalChapters = '';
  $('.truyen-meta span').each((_, el) => {
    const text = $(el).text();
    if (text.match(/Số chương|Tổng chương/i)) {
      totalChapters = text.replace(/.*:\s*/i, '').trim();
      return false;
    }
  });

  const description = $('.truyen-desc').text().trim();

  return {
    story_name: title,
    description,
    author,
    genre,
    total_num_chapters: totalChapters,
    story_source: storyUrl,
    story_status: status,
  };
}

// Lấy tổng số trang từ pagination trên trang truyện
function extractTotalPages(html) {
  const $ = cheerio.load(html);
  let maxPage = 1;
  // Tìm max trong tất cả .page-numbers (bỏ qua nút Prev/Next dạng text)
  $('.ct-pagination .page-numbers, .pagination .page-numbers').each((_, el) => {
    const n = parseInt($(el).text().trim(), 10);
    if (!isNaN(n) && n > maxPage) maxPage = n;
  });
  return maxPage;
}

// ─── Chapter list page parser ─────────────────────────────────────────────────

// URL chương: /chuong-{number}-{slug}/
const CHAPTER_URL_RE = /\/chuong-(\d+)-[^/]+\/?/;

function parseChapterLinksFromHtml(html) {
  const $ = cheerio.load(html);
  const chapters = {};

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(CHAPTER_URL_RE);
    if (m) {
      const num = parseInt(m[1], 10);
      if (!chapters[num]) {
        chapters[num] = href.startsWith('http') ? href : `${BASE_URL}${href}`;
      }
    }
  });

  return chapters;
}

// ─── Chapter discovery ────────────────────────────────────────────────────────

async function discoverAllChapters(storySlug, totalPages, known, cacheFile) {
  console.log(`   Tổng ${totalPages} trang danh sách chương, đang tải...`);
  let found = 0;

  for (let page = 1; page <= totalPages; page++) {
    process.stdout.write(`\r   Trang ${page}/${totalPages}...`);
    await sleep(DELAY_MS);

    const url = page === 1
      ? `${BASE_URL}/truyen/${storySlug}/`
      : `${BASE_URL}/truyen/${storySlug}/page/${page}/`;

    const html = await fetchHtml(url);
    if (!html) {
      process.stdout.write(` [Bỏ qua trang ${page}]\n`);
      continue;
    }

    const batch = parseChapterLinksFromHtml(html);
    for (const [num, url] of Object.entries(batch)) {
      const needsUpdate = !known[num] || !known[num].startsWith(BASE_URL);
      if (needsUpdate) { known[num] = url; found++; }
    }
  }

  process.stdout.write('\n');
  saveCache(cacheFile, known);
  console.log(`   Khám phá xong: ${Object.keys(known).length} chương (${found} mới)`);
  return known;
}

// ─── Chapter page parser ──────────────────────────────────────────────────────

function parseChapter(html) {
  const $ = cheerio.load(html);

  const rawTitle = $('h1.page-title').text().trim() || $('h1').first().text().trim();
  const m = rawTitle.match(/Chương\s+(\d+)\s*[:\-–]\s*(.*)/i);
  const chapterNumber = m ? `Chương ${m[1]}` : rawTitle;
  const chapterName = m ? m[2].trim() : '';

  // Lấy <p> trực tiếp bên trong .entry-content, bỏ qua nội dung bên trong .story-navigation và .reading-tools-bar
  const entryContent = $('.entry-content');
  entryContent.find('.story-navigation, .reading-tools-bar').remove();
  // Trang nguồn dùng <br> đơn để ngăn đoạn trong cùng 1 <p> → quy đổi thành '\n' trước khi lấy text.
  entryContent.find('br').replaceWith('\n');

  const pTags = entryContent.find('p');
  const lines = pTags.length ? pTags.map((_, el) => $(el).text()).get() : [entryContent.text()];

  // Mỗi dòng (do <br> hoặc do ranh giới <p> tạo ra) đều coi là một đoạn riêng, ngăn bằng '\n\n'.
  const content = lines
    .flatMap((t) => t.split('\n'))
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n\n');

  return { chapterNumber, chapterName, content };
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { url: null, from: null, to: null, chapter: null };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--from' && args[i + 1]) result.from = parseInt(args[++i], 10);
    else if (a === '--to' && args[i + 1]) result.to = parseInt(args[++i], 10);
    else if (a === '--chapter' && args[i + 1]) result.chapter = parseInt(args[++i], 10);
    else if (!a.startsWith('-')) result.url = a;
  }

  return result;
}

function printHelp() {
  console.log(`
Crawler truyện từ khotruyenchu.fun
────────────────────────────────────────────────────
Cách dùng:
  node index.js <story-url> [options]

Options:
  --from N      Tải từ chương N trở đi
  --to N        Tải đến chương N (bao gồm)
  --chapter N   Chỉ tải đúng chương N

Ví dụ:
  node index.js https://khotruyenchu.fun/truyen/tien-nghich/
  node index.js https://khotruyenchu.fun/truyen/tien-nghich/ --from 1 --to 100
  node index.js https://khotruyenchu.fun/truyen/tien-nghich/ --from 101 --to 200
  node index.js https://khotruyenchu.fun/truyen/tien-nghich/ --chapter 50

Lưu ý:
  - Dữ liệu lưu tại:  thien-dao/<slug>/
  - Cache URL chương: thien-dao/<slug>/.cache.json
  - Chạy lại → bỏ qua file và cache đã có
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();

  if (!args.url) { printHelp(); process.exit(0); }

  const storySlug = extractStorySlug(args.url);
  if (!storySlug) {
    console.error('URL không hợp lệ. Ví dụ: https://khotruyenchu.fun/truyen/tien-nghich/');
    process.exit(1);
  }

  const storyUrl = `${BASE_URL}/truyen/${storySlug}/`;
  const outputDir = path.join(OUTPUT_BASE, storySlug);
  const cacheFile = path.join(outputDir, '.cache.json');

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\nTruyện  : ${storySlug}`);
  console.log(`Lưu tại : ${outputDir}`);
  console.log('─'.repeat(52));

  // ── 1. Story metadata ─────────────────────────────────────
  const introFile = path.join(outputDir, '0_gioi_thieu.txt');
  let storyInfo;

  process.stdout.write('Đang tải trang truyện...');
  const storyHtml = await fetchHtml(storyUrl);
  if (!storyHtml) { console.error('\nKhông thể tải trang truyện.'); process.exit(1); }

  const totalPages = extractTotalPages(storyHtml);
  console.log(` OK (${totalPages} trang)`);

  if (!fs.existsSync(introFile)) {
    storyInfo = parseStoryInfo(storyHtml, storyUrl);
    fs.writeFileSync(introFile, JSON.stringify(storyInfo, null, 2), 'utf8');
    console.log(`Thông tin: ${storyInfo.story_name} — ${storyInfo.story_status}`);
  } else {
    storyInfo = JSON.parse(fs.readFileSync(introFile, 'utf8'));
    console.log(`Thông tin: ${storyInfo.story_name} (đã có)`);
  }

  // ── 2. Xác định khoảng chương cần tải ────────────────────
  let fromChapter = args.from ?? 1;
  let toChapter = args.to ?? Infinity;
  if (args.chapter !== null) { fromChapter = args.chapter; toChapter = args.chapter; }

  const rangeLabel = toChapter === Infinity ? `${fromChapter} → hết` : `${fromChapter} → ${toChapter}`;
  console.log(`Khoảng  : ${rangeLabel}`);

  // ── 3. Khám phá URL chương ────────────────────────────────
  let known = loadCache(cacheFile);

  const neededNums = toChapter !== Infinity
    ? Array.from({ length: toChapter - fromChapter + 1 }, (_, i) => fromChapter + i).filter((n) => !known[n])
    : [];

  const hasKnownInRange = toChapter === Infinity
    ? Object.keys(known).some((n) => parseInt(n, 10) >= fromChapter)
    : true;
  const needsDiscovery = neededNums.length > 0 || !hasKnownInRange;

  if (needsDiscovery) {
    await sleep(DELAY_MS);
    known = await discoverAllChapters(storySlug, totalPages, known, cacheFile);
  } else {
    console.log(`Cache   : ${Object.keys(known).length} chương (dùng lại)`);
  }

  // ── 4. Danh sách chương cần download ─────────────────────
  const errorFile = path.join(outputDir, '.cache-error.json');
  const errorCache = loadCache(errorFile);
  const siteGaps = new Set(errorCache.site_gaps || []);

  let downloadList;
  if (toChapter !== Infinity) {
    downloadList = [];
    for (let n = fromChapter; n <= toChapter; n++) {
      if (known[n]) {
        downloadList.push(n);
      } else {
        siteGaps.add(n);
        console.log(`   Thông tin: chương ${n} không tồn tại trên site (site bỏ qua số này)`);
      }
    }
  } else {
    downloadList = Object.keys(known).map(Number).filter((n) => n >= fromChapter).sort((a, b) => a - b);
  }

  if (downloadList.length === 0) {
    console.log('\nKhông tìm thấy chương nào trong khoảng đã chọn.');
    process.exit(0);
  }

  console.log(`\nBắt đầu tải ${downloadList.length} chương...\n`);

  // ── 5. Download ───────────────────────────────────────────
  let success = 0, skipped = 0, failed = 0;
  const downloadFailed = new Set(errorCache.download_failed || []);
  for (const n of [...siteGaps]) { if (known[n]) siteGaps.delete(n); }

  for (const num of downloadList) {
    const filePath = path.join(outputDir, `${num}_chuong_${num}.txt`);

    if (fs.existsSync(filePath)) {
      process.stdout.write(`   [${num}] Bỏ qua (đã tải)\n`);
      downloadFailed.delete(num);
      skipped++;
      continue;
    }

    process.stdout.write(`   [${num}] Đang tải...`);
    await sleep(DELAY_MS);

    const html = await fetchHtml(known[num]);
    if (!html) {
      process.stdout.write(' THẤT BẠI\n');
      downloadFailed.add(num);
      failed++;
      continue;
    }

    const chapter = parseChapter(html);
    if (!chapter.content) {
      process.stdout.write(' THẤT BẠI (không có nội dung)\n');
      downloadFailed.add(num);
      failed++;
      continue;
    }

    fs.writeFileSync(filePath, JSON.stringify({
      chapter_number: chapter.chapterNumber,
      chapter_name: chapter.chapterName,
      chapter_content: chapter.content,
    }, null, 2), 'utf8');

    downloadFailed.delete(num);
    process.stdout.write(` OK — ${chapter.chapterNumber}: ${chapter.chapterName}\n`);
    success++;
  }

  // ── 6. Ghi file lỗi ──────────────────────────────────────
  const gapsArr = [...siteGaps].sort((a, b) => a - b);
  const failedArr = [...downloadFailed].sort((a, b) => a - b);

  if (gapsArr.length > 0 || failedArr.length > 0) {
    fs.writeFileSync(errorFile, JSON.stringify({
      site_gaps: gapsArr,
      download_failed: failedArr,
    }, null, 2), 'utf8');
    if (gapsArr.length > 0) console.log(`\nSite gaps  : ${gapsArr.length} chương site bỏ qua (${gapsArr.slice(0, 5).join(', ')}${gapsArr.length > 5 ? '...' : ''})`);
    if (failedArr.length > 0) console.log(`Tải lỗi    : ${failedArr.length} chương → ${path.basename(errorFile)}`);
  } else if (fs.existsSync(errorFile)) {
    fs.unlinkSync(errorFile);
  }

  console.log('\n' + '─'.repeat(52));
  console.log(`Hoàn thành: ${success} tải mới | ${skipped} bỏ qua | ${failed} thất bại`);
  console.log(`Thư mục: ${outputDir}`);
}

main().catch((err) => {
  console.error('\nLỗi:', err.message);
  process.exit(1);
});
