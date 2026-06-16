#!/usr/bin/env node
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = 'https://metruyenchuvn.com';
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

// Gọi AJAX endpoint lấy danh sách chương; trả về chuỗi HTML bên trong JSON
async function fetchChapterListPage(storyId, page) {
  const url = `${BASE_URL}/get/listchap/${storyId}?page=${page}`;
  for (let attempt = 1; attempt <= RETRY_COUNT; attempt++) {
    try {
      const res = await axios.get(url, {
        headers: { ...HEADERS, 'X-Requested-With': 'XMLHttpRequest' },
        timeout: 20000,
      });
      return res.data?.data || null;
    } catch (err) {
      const isLast = attempt === RETRY_COUNT;
      if (!isLast) await sleep(RETRY_DELAY_MS);
      else return null;
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
    return u.pathname.replace(/^\//, '').split('/')[0] || null;
  } catch {
    return null;
  }
}

function parseStoryInfo(html, storyUrl) {
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim();
  const author = $('a[href*="/tac-gia/"]').first().text().trim();
  const genre = $('.li--genres a[href*="/the-loai/"]')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean)
    .join(', ');

  const totalChaptersLi = $('.book-info-text li').filter((_, el) =>
    $(el).find('b').text().includes('Số chương')
  );
  const totalChapters = totalChaptersLi.text().replace(/Số chương\s*:?\s*/i, '').trim();
  const status = $('span.label-status').first().text().trim();

  // Mô tả nằm trong p.desc-text-full > strong
  let description = '';
  $('b').each((_, el) => {
    if ($(el).text().includes('Giới Thiệu')) {
      description = $(el).parent().find('strong').first().text().trim();
      return false;
    }
  });
  if (!description) description = $('p.desc-text').text().trim();

  return { story_name: title, description, author, genre, total_num_chapters: totalChapters, story_source: storyUrl, story_status: status };
}

// Lấy story ID từ các nút pagination có dạng onclick="page(ID, page)"
function extractStoryId(html) {
  const m = html.match(/page\((\d+)[,)]/);
  return m ? m[1] : null;
}

// Lấy tổng số trang: tìm max trong tất cả page(storyId, N) — N lớn nhất là số trang cuối
function extractTotalPages(html, storyId) {
  const matches = [...html.matchAll(new RegExp(`page\\(${storyId},\\s*(\\d+)\\)`, 'g'))];
  if (!matches.length) return null;
  return Math.max(...matches.map((m) => parseInt(m[1], 10)));
}

// ─── Chapter list page parser ─────────────────────────────────────────────────

function parseChapterLinksFromHtml(html, storySlug) {
  const $ = cheerio.load(html);
  const chapters = {};
  // Xử lý cả hai dạng URL:
  //   cũ: /story/chuong-{num}-{id}
  //   mới: /story/chuong-chuong-{num}-{id}   (double "chuong-")
  // Chapter ID có thể chứa: chữ, số, _, -, !  (ví dụ: XoZCkZ!pamLw)
  const pattern = new RegExp(`^/?${storySlug}/chuong-(?:chuong-)?(\\d+)-[A-Za-z0-9_!-]+$`);

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const clean = href.replace(/^https?:\/\/[^/]+/, '');
    const m = clean.match(pattern);
    if (m) {
      const num = parseInt(m[1], 10);
      // Lưu URL đúng nguyên như href trả về (không reconstruct)
      if (!chapters[num]) {
        chapters[num] = clean.startsWith('/') ? `${BASE_URL}${clean}` : `${BASE_URL}/${clean}`;
      }
    }
  });

  return chapters;
}

// ─── Chapter page parser ──────────────────────────────────────────────────────

function parseChapter(html) {
  const $ = cheerio.load(html);

  const rawTitle = $('h2.current-chapter').text().trim() || $('h2').first().text().trim();
  const m = rawTitle.match(/Chương\s+(\d+)\s*[:\-–]\s*(.*)/i);
  const chapterNumber = m ? `Chương ${m[1]}` : rawTitle;
  const chapterName = m ? m[2].trim() : '';

  const truyen = $('.truyen');
  // Trang nguồn có thể dùng <br> để xuống dòng (trong hoặc ngoài <p>) → quy đổi thành '\n' trước,
  // nếu không các dòng sẽ bị dính liền nhau khi lấy text.
  truyen.find('br').replaceWith('\n');

  const pTags = truyen.find('p');
  const lines = pTags.length ? pTags.map((_, el) => $(el).text()).get() : [truyen.text()];

  // Mỗi dòng (do <br> hoặc do ranh giới <p> tạo ra) đều coi là một đoạn riêng, ngăn bằng '\n\n'.
  const content = lines
    .flatMap((t) => t.split('\n'))
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n\n');

  return { chapterNumber, chapterName, content };
}

// ─── AJAX chapter discovery ───────────────────────────────────────────────────

/**
 * Tải toàn bộ danh sách chương qua API AJAX.
 * Trả về object {num: url} đã merge vào known.
 */
async function discoverAllChapters(storyId, storySlug, totalPages, known, cacheFile) {
  console.log(`   Tổng ${totalPages} trang danh sách chương, đang tải...`);
  let found = 0;

  for (let page = 1; page <= totalPages; page++) {
    process.stdout.write(`\r   Trang ${page}/${totalPages}...`);
    await sleep(DELAY_MS);

    const html = await fetchChapterListPage(storyId, page);
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
Crawler truyện từ metruyenchuvn.com
────────────────────────────────────────────────────
Cách dùng:
  node index.js <story-url> [options]

Options:
  --from N      Tải từ chương N trở đi
  --to N        Tải đến chương N (bao gồm)
  --chapter N   Chỉ tải đúng chương N

Ví dụ:
  node index.js https://metruyenchuvn.com/tien-nghich
  node index.js https://metruyenchuvn.com/tien-nghich --from 1 --to 100
  node index.js https://metruyenchuvn.com/tien-nghich --from 101 --to 200
  node index.js https://metruyenchuvn.com/tien-nghich --chapter 50

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
    console.error('URL không hợp lệ. Ví dụ: https://metruyenchuvn.com/tien-nghich');
    process.exit(1);
  }

  const storyUrl = `${BASE_URL}/${storySlug}`;
  const outputDir = path.join(OUTPUT_BASE, storySlug);
  const cacheFile = path.join(outputDir, '.cache.json');

  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\nTruyện  : ${storySlug}`);
  console.log(`Lưu tại : ${outputDir}`);
  console.log('─'.repeat(52));

  // ── 1. Story metadata + story ID ──────────────────────────
  const introFile = path.join(outputDir, '0_gioi_thieu.txt');
  let storyInfo;
  let storyId;

  process.stdout.write('Đang tải trang truyện...');
  const storyHtml = await fetchHtml(storyUrl);
  if (!storyHtml) { console.error('\nKhông thể tải trang truyện.'); process.exit(1); }

  storyId = extractStoryId(storyHtml);
  if (!storyId) { console.error('\nKhông tìm được story ID trong trang.'); process.exit(1); }

  const totalPages = extractTotalPages(storyHtml, storyId);
  console.log(` OK (ID: ${storyId}, ${totalPages ?? '?'} trang)`);

  if (!fs.existsSync(introFile)) {
    storyInfo = parseStoryInfo(storyHtml, storyUrl);
    fs.writeFileSync(introFile, JSON.stringify(storyInfo, null, 2), 'utf8');
    console.log(`Thông tin: ${storyInfo.story_name} — ${storyInfo.total_num_chapters} chương, ${storyInfo.story_status}`);
  } else {
    storyInfo = JSON.parse(fs.readFileSync(introFile, 'utf8'));
    console.log(`Thông tin: ${storyInfo.story_name} (đã có)`);
  }

  // ── 2. Xác định khoảng chương cần tải ────────────────────
  let fromChapter = args.from ?? 1;
  let toChapter = args.to ?? Infinity;
  if (args.chapter !== null) { fromChapter = args.chapter; toChapter = args.chapter; }

  const totalKnown = parseInt(storyInfo.total_num_chapters, 10) || null;
  const effectiveTo = toChapter === Infinity && totalKnown ? totalKnown : toChapter;
  const rangeLabel = effectiveTo === Infinity ? `${fromChapter} → hết` : `${fromChapter} → ${effectiveTo}`;
  console.log(`Khoảng  : ${rangeLabel}`);

  // ── 3. Khám phá URL chương qua AJAX ──────────────────────
  let known = loadCache(cacheFile);

  // Kiểm tra xem cache đã đủ chưa
  const neededNums = effectiveTo !== Infinity
    ? Array.from({ length: effectiveTo - fromChapter + 1 }, (_, i) => fromChapter + i).filter(n => !known[n])
    : [];

  const hasKnownInRange = effectiveTo === Infinity
    ? Object.keys(known).some((n) => parseInt(n, 10) >= fromChapter)
    : true;
  const needsDiscovery = neededNums.length > 0 || !hasKnownInRange;

  if (needsDiscovery) {
    if (totalPages) {
      await sleep(DELAY_MS);
      known = await discoverAllChapters(storyId, storySlug, totalPages, known, cacheFile);
    } else {
      // totalPages không lấy được (truyện 1 trang, không có nút Cuối)
      // Lấy từ trang truyện đã tải
      console.log('   Chỉ có 1 trang danh sách chương, lấy từ trang truyện...');
      const batch = parseChapterLinksFromHtml(storyHtml, storySlug);
      Object.assign(known, batch);
      saveCache(cacheFile, known);
      console.log(`   Tìm thấy ${Object.keys(known).length} chương`);
    }
  } else {
    console.log(`Cache   : ${Object.keys(known).length} chương (dùng lại)`);
  }

  // ── 4. Danh sách chương cần download ─────────────────────
  const errorFile = path.join(outputDir, '.cache-error.json');
  const errorCache = loadCache(errorFile); // { site_gaps: [], download_failed: [] }
  // site_gaps: chương site không có (đã quét hết nhưng không tìm thấy)
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
    downloadList = Object.keys(known).map(Number).filter(n => n >= fromChapter).sort((a, b) => a - b);
  }

  if (downloadList.length === 0) {
    console.log('\nKhông tìm thấy chương nào trong khoảng đã chọn.');
    process.exit(0);
  }

  console.log(`\nBắt đầu tải ${downloadList.length} chương...\n`);

  // ── 5. Download ───────────────────────────────────────────
  let success = 0, skipped = 0, failed = 0;
  const downloadFailed = new Set(errorCache.download_failed || []);
  // Xóa khỏi site_gaps nếu chapter đã được cache sau lần discovery mới
  for (const n of [...siteGaps]) { if (known[n]) siteGaps.delete(n); }

  for (const num of downloadList) {
    const filePath = path.join(outputDir, `${num}_chuong_${num}.txt`);

    if (fs.existsSync(filePath)) {
      process.stdout.write(`   [${num}] Bỏ qua (đã tải)\n`);
      downloadFailed.delete(num); // thành công trước đó, xóa khỏi error nếu có
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

    downloadFailed.delete(num); // xóa khỏi error nếu trước đó bị lỗi
    process.stdout.write(` OK — ${chapter.chapterNumber}: ${chapter.chapterName}\n`);
    success++;
  }

  // ── 6. Ghi file lỗi ──────────────────────────────────────
  const gapsArr = [...siteGaps].sort((a, b) => a - b);
  const failedArr = [...downloadFailed].sort((a, b) => a - b);

  if (gapsArr.length > 0 || failedArr.length > 0) {
    fs.writeFileSync(errorFile, JSON.stringify({
      site_gaps: gapsArr,      // site không có chương này (số bị bỏ qua)
      download_failed: failedArr, // có URL nhưng fetch thất bại
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
