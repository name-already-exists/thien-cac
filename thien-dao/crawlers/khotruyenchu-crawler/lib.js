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
    const url = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    // Ưu tiên số chương từ text của thẻ a
    const textMatch = $(el).text().trim().match(/Chương\s+(\d+)/i);
    if (textMatch) {
      const num = parseInt(textMatch[1], 10);
      if (!chapters[num]) chapters[num] = url;
      return;
    }

    // Fallback: lấy số từ URL
    const urlMatch = href.match(CHAPTER_URL_RE);
    if (urlMatch) {
      const num = parseInt(urlMatch[1], 10);
      if (!chapters[num]) chapters[num] = url;
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

// ─── Story path resolution (dùng chung cho CLI và app điều khiển) ────────────

function resolveStoryPaths(url) {
  const storySlug = extractStorySlug(url);
  if (!storySlug) return null;
  const storyUrl = `${BASE_URL}/truyen/${storySlug}/`;
  const outputDir = path.join(OUTPUT_BASE, storySlug);
  const cacheFile = path.join(outputDir, '.cache.json');
  return { storySlug, storyUrl, outputDir, cacheFile };
}

// ─── Story metadata (luôn chạy trước, cả 2 nhánh discover/download) ─────────
// Thân hàm giống hệt mục "1. Story metadata" cũ trong main().

async function fetchStoryMeta(storyUrl, outputDir) {
  const introFile = path.join(outputDir, '0_gioi_thieu.txt');

  process.stdout.write('Đang tải trang truyện...');
  const storyHtml = await fetchHtml(storyUrl);
  if (!storyHtml) {
    console.error('\nKhông thể tải trang truyện.');
    return { ok: false, reason: 'story-fetch-failed' };
  }

  const totalPages = extractTotalPages(storyHtml);
  console.log(` OK (${totalPages} trang)`);

  let storyInfo;
  if (!fs.existsSync(introFile)) {
    storyInfo = parseStoryInfo(storyHtml, storyUrl);
    fs.writeFileSync(introFile, JSON.stringify(storyInfo, null, 2), 'utf8');
    console.log(`Thông tin: ${storyInfo.story_name} — ${storyInfo.story_status}`);
  } else {
    storyInfo = JSON.parse(fs.readFileSync(introFile, 'utf8'));
    console.log(`Thông tin: ${storyInfo.story_name} (đã có)`);
  }

  return { ok: true, storyInfo, totalPages };
}

// ─── BƯỚC 1: Discovery (--discover) ──────────────────────────────────────────

async function discoverStory(storySlug, totalPages, cacheFile) {
  await sleep(DELAY_MS);
  let known = loadCache(cacheFile);
  known = await discoverAllChapters(storySlug, totalPages, known, cacheFile);

  console.log('\n' + '─'.repeat(52));
  console.log(`Discovery xong: ${Object.keys(known).length} chương`);
  console.log(`Cache: ${cacheFile}`);

  return { ok: true, chapterCount: Object.keys(known).length };
}

// ─── BƯỚC 2, mục 3: tự khám phá thêm nếu cache chưa đủ cho khoảng cần tải ────
// Thân hàm giống hệt mục "3. Khám phá URL chương" cũ trong main().

async function ensureChaptersKnown(storySlug, totalPages, cacheFile, fromChapter, toChapter) {
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

  return known;
}

// ─── BƯỚC 2, mục 4: xác định danh sách chương cần tải ────────────────────────

function buildDownloadList(known, fromChapter, toChapter, errorCache) {
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

  const downloadFailed = new Set(errorCache.download_failed || []);
  for (const n of [...siteGaps]) { if (known[n]) siteGaps.delete(n); }

  return { downloadList, siteGaps, downloadFailed };
}

// ─── BƯỚC 2, mục 5: tải chương ────────────────────────────────────────────────

async function downloadChapters(list, { known, outputDir, downloadFailed, concurrency = 1, onEvent } = {}) {
  const emit = onEvent || (() => {});
  let success = 0, skipped = 0, failed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < list.length) {
      // Nhường event loop giữa mỗi chương — nhánh "đã tải" bên dưới không có await
      // nào, nếu không có dòng này 1 story hàng nghìn chương đã tải sẽ chạy đồng bộ
      // liền mạch và làm treo cả server (chỉ ảnh hưởng tốc độ vài ms, không đổi output).
      await new Promise((resolve) => setImmediate(resolve));

      const num = list[cursor++];
      const filePath = path.join(outputDir, `${num}_chuong_${num}.txt`);

      if (fs.existsSync(filePath)) {
        process.stdout.write(`   [${num}] Bỏ qua (đã tải)\n`);
        downloadFailed.delete(num);
        skipped++;
        emit({ type: 'skip', num });
        continue;
      }

      process.stdout.write(`   [${num}] Đang tải...`);
      await sleep(DELAY_MS);

      const html = await fetchHtml(known[num]);
      if (!html) {
        process.stdout.write(' THẤT BẠI\n');
        downloadFailed.add(num);
        failed++;
        emit({ type: 'fail', num, reason: 'fetch' });
        continue;
      }

      const chapter = parseChapter(html);
      if (!chapter.content) {
        process.stdout.write(' THẤT BẠI (không có nội dung)\n');
        downloadFailed.add(num);
        failed++;
        emit({ type: 'fail', num, reason: 'empty' });
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
      emit({ type: 'success', num, chapterLabel: chapter.chapterNumber, title: chapter.chapterName });
    }
  }

  const workerCount = Math.max(1, concurrency);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return { success, skipped, failed };
}

// ─── BƯỚC 2, mục 6: ghi/xóa file lỗi tổng hợp ─────────────────────────────────

function finalizeErrorFile(errorFile, siteGaps, downloadFailed) {
  const gapsArr = [...siteGaps].sort((a, b) => a - b);
  const failedArr = [...downloadFailed].sort((a, b) => a - b);

  if (gapsArr.length > 0 || failedArr.length > 0) {
    fs.writeFileSync(errorFile, JSON.stringify({
      site_gaps: gapsArr,
      download_failed: failedArr,
    }, null, 2), 'utf8');
  } else if (fs.existsSync(errorFile)) {
    fs.unlinkSync(errorFile);
  }

  return { gapsArr, failedArr };
}

module.exports = {
  BASE_URL,
  DELAY_MS,
  OUTPUT_BASE,
  sleep,
  fetchHtml,
  loadCache,
  saveCache,
  extractStorySlug,
  parseStoryInfo,
  extractTotalPages,
  parseChapterLinksFromHtml,
  parseChapter,
  discoverAllChapters,
  resolveStoryPaths,
  fetchStoryMeta,
  discoverStory,
  ensureChaptersKnown,
  buildDownloadList,
  downloadChapters,
  finalizeErrorFile,
};
