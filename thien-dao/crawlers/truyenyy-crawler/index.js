#!/usr/bin/env node
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = 'https://truyenyy.co';
const DELAY_MS = 1200;
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 3000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
  'Referer': BASE_URL,
};

const OUTPUT_BASE = path.join(__dirname, '../../storage');

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
    const m = u.pathname.match(/\/truyen\/([^/?#]+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function parseStoryInfo(html, storyUrl) {
  const $ = cheerio.load(html);

  // Title: dùng h1
  const title = $('h1').first().text().trim();

  // Author: từ Next.js JSON data trong script tags
  let author = '';
  const authorM = html.match(/"name":"([^"]{1,80})","slugId":/);
  if (authorM) author = authorM[1];

  // Meta: dùng regex trên raw HTML vì cấu trúc span lồng nhau phức tạp
  // VD: <span>Số chương</span><span class="...">1331</span>
  const chapM = html.match(/Số chương<\/span><span[^>]*>(\d+)/);
  const totalChapters = chapM ? chapM[1] : '';

  const statusM = html.match(/Trạng thái<\/span><span[^>]*>([^<]+)<\/span>/);
  const status = statusM ? statusM[1].trim() : '';

  // Genre: VD <span>Thể loại</span><span class="...">Tiên hiệp , Huyền huyễn,...</span>
  const genreM = html.match(/Thể loại<\/span><span[^>]*>([^<]+)<\/span>/);
  const genre = genreM ? genreM[1].trim() : '';

  // Description: tìm div prose hoặc fallback regex
  let description = '';
  $('[class]').each((_, el) => {
    const cls = $(el).attr('class') || '';
    if (cls.includes('whitespace-break-spaces') && cls.includes('prose') && !cls.includes('line-clamp')) {
      description = $(el).text().trim();
      return false;
    }
  });
  if (!description) {
    // Fallback: lấy từ Next.js script chunk có nội dung dài
    const chunks = html.match(/self\.__next_f\.push\(\[1,"([^"]{200,})"\]\)/g) || [];
    for (const chunk of chunks) {
      const raw = chunk.replace(/^self\.__next_f\.push\(\[1,"/, '').replace(/"\]\)$/, '');
      if (raw.includes('\\n\\n') && !raw.includes('className')) {
        description = raw.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
        break;
      }
    }
  }

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

// Lấy tổng số trang từ Next.js hydration data trong HTML
// HTML embeds escaped JSON: \"totalPages\":N
function extractTotalPages(html) {
  const m = html.match(/\\"totalPages\\":(\d+)/) || html.match(/"totalPages":(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

// ─── Chapter list page parser ─────────────────────────────────────────────────

// URL chương: /truyen/{slug}/chuong-{number}-{title-slug}
function parseChapterLinksFromHtml(html, storySlug) {
  const $ = cheerio.load(html);
  const chapters = {};
  const pattern = new RegExp(`/truyen/${storySlug}/chuong-(\\d+)-[^/?#"'\\s]+`);

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(pattern);
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

async function discoverAllChapters(storySlug, known, cacheFile) {
  const listBaseUrl = `${BASE_URL}/truyen/${storySlug}/danh-sach-chuong`;

  process.stdout.write('   Đang tải trang 1 để lấy tổng số trang...');
  const firstHtml = await fetchHtml(listBaseUrl);
  if (!firstHtml) {
    process.stdout.write(' THẤT BẠI\n');
    return known;
  }

  const totalPages = extractTotalPages(firstHtml);
  console.log(` OK (${totalPages} trang)`);

  let found = 0;

  // Page 1
  const batch1 = parseChapterLinksFromHtml(firstHtml, storySlug);
  for (const [num, url] of Object.entries(batch1)) {
    if (!known[num]) { known[num] = url; found++; }
  }

  // Pages 2..totalPages
  for (let page = 2; page <= totalPages; page++) {
    process.stdout.write(`\r   Trang ${page}/${totalPages}...`);
    await sleep(DELAY_MS);

    const url = `${listBaseUrl}?p=${page}`;
    const html = await fetchHtml(url);
    if (!html) {
      process.stdout.write(` [Bỏ qua trang ${page}]\n`);
      continue;
    }

    const batch = parseChapterLinksFromHtml(html, storySlug);
    for (const [num, url] of Object.entries(batch)) {
      if (!known[num]) { known[num] = url; found++; }
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

  // Chapter number: tìm div/span chứa "Chương N :"
  let chapterNumber = '';
  $('div, span').each((_, el) => {
    const text = $(el).text().trim();
    const m = text.match(/^(Chương\s+\d+)\s*:/i);
    if (m) {
      chapterNumber = m[1];
      return false;
    }
  });

  // Chapter name: từ thẻ h1
  const chapterName = $('h1').first().text().trim();

  // Content: các thẻ <p> không có class, bỏ qua điều hướng và thông báo VIP
  const paragraphs = [];
  $('p').each((_, el) => {
    // Bỏ qua p có class (navigation, header, word-count...)
    if ($(el).attr('class')) return;

    const text = $(el).text().trim();

    // Bỏ qua nút điều hướng và thông báo VIP
    if (text === 'Trước' || text === 'Tiếp') return;
    if (text.includes('Đọc chương VIP') || text.includes('ứng dụng dành riêng')) return;

    if (text) paragraphs.push(text);
  });

  // Mỗi đoạn text ngăn bằng '\n\n'
  const content = paragraphs.join('\n\n');

  return { chapterNumber, chapterName, content };
}

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
Crawler truyện từ truyenyy.co
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
  node index.js https://truyenyy.co/truyen/kiem-lai --discover
  node index.js https://truyenyy.co/truyen/kiem-lai --from 1 --to 300
  node index.js https://truyenyy.co/truyen/kiem-lai --from 301 --to 600
  node index.js https://truyenyy.co/truyen/kiem-lai --chapter 50

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

  const storySlug = extractStorySlug(args.url);
  if (!storySlug) {
    console.error('URL không hợp lệ. Ví dụ: https://truyenyy.co/truyen/kiem-lai');
    process.exit(1);
  }

  const storyUrl = `${BASE_URL}/truyen/${storySlug}`;
  const outputDir = path.join(OUTPUT_BASE, storySlug);
  const cacheFile = path.join(outputDir, '.cache.json');

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\nTruyện  : ${storySlug}`);
  console.log(`Lưu tại : ${outputDir}`);
  console.log('─'.repeat(52));

  // ══════════════════════════════════════════════════════════
  // BƯỚC 1: Discovery — lấy toàn bộ cache URL chương
  // ══════════════════════════════════════════════════════════
  if (args.discover) {
    process.stdout.write('Đang tải trang truyện...');
    const storyHtml = await fetchHtml(storyUrl);
    if (!storyHtml) { console.error('\nKhông thể tải trang truyện.'); process.exit(1); }
    console.log(' OK');

    const introFile = path.join(outputDir, '0_gioi_thieu.txt');
    if (!fs.existsSync(introFile)) {
      const storyInfo = parseStoryInfo(storyHtml, storyUrl);
      fs.writeFileSync(introFile, JSON.stringify(storyInfo, null, 2), 'utf8');
      console.log(`Thông tin: ${storyInfo.story_name} — ${storyInfo.total_num_chapters} chương, ${storyInfo.story_status}`);
    } else {
      const storyInfo = JSON.parse(fs.readFileSync(introFile, 'utf8'));
      console.log(`Thông tin: ${storyInfo.story_name} (đã có)`);
    }

    await sleep(DELAY_MS);
    let known = loadCache(cacheFile);
    known = await discoverAllChapters(storySlug, known, cacheFile);

    console.log('\n' + '─'.repeat(52));
    console.log(`Discovery xong: ${Object.keys(known).length} chương`);
    console.log(`Cache: ${cacheFile}`);
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

  const totalKnown = parseInt(storyInfo.total_num_chapters, 10) || null;
  const effectiveTo = toChapter === Infinity && totalKnown ? totalKnown : toChapter;
  const rangeLabel = effectiveTo === Infinity ? `${fromChapter} → hết` : `${fromChapter} → ${effectiveTo}`;
  console.log(`Khoảng  : ${rangeLabel}`);

  const errorFile = path.join(outputDir, '.cache-error.json');
  const errorCache = loadCache(errorFile);
  const siteGaps = new Set(errorCache.site_gaps || []);

  let downloadList;
  if (effectiveTo !== Infinity) {
    downloadList = [];
    for (let n = fromChapter; n <= effectiveTo; n++) {
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
