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

// Output directory: thien-dao/storage/
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

// ─── Story path resolution (dùng chung cho CLI và app điều khiển) ────────────

function resolveStoryPaths(url) {
  const storySlug = extractStorySlug(url);
  if (!storySlug) return null;
  const storyUrl = `${BASE_URL}/${storySlug}`;
  const outputDir = path.join(OUTPUT_BASE, storySlug);
  const cacheFile = path.join(outputDir, '.cache.json');
  return { storySlug, storyUrl, outputDir, cacheFile };
}

// ─── BƯỚC 1: Discovery — lấy toàn bộ cache URL chương ────────────────────────
// Thân hàm giống hệt nhánh --discover cũ trong main(); thay vì process.exit,
// trả về { ok:false, reason } khi lỗi để nơi gọi (CLI hoặc app điều khiển) tự quyết định.

async function discoverStory(storyUrl, storySlug, outputDir, cacheFile) {
  process.stdout.write('Đang tải trang truyện...');
  const storyHtml = await fetchHtml(storyUrl);
  if (!storyHtml) {
    console.error('\nKhông thể tải trang truyện.');
    return { ok: false, reason: 'story-fetch-failed' };
  }

  const storyId = extractStoryId(storyHtml);
  if (!storyId) {
    console.error('\nKhông tìm được story ID trong trang.');
    return { ok: false, reason: 'story-id-not-found' };
  }

  const totalPages = extractTotalPages(storyHtml, storyId);
  console.log(` OK (ID: ${storyId}, ${totalPages ?? '?'} trang)`);

  const introFile = path.join(outputDir, '0_gioi_thieu.txt');
  let storyInfo;
  if (!fs.existsSync(introFile)) {
    storyInfo = parseStoryInfo(storyHtml, storyUrl);
    fs.writeFileSync(introFile, JSON.stringify(storyInfo, null, 2), 'utf8');
    console.log(`Thông tin: ${storyInfo.story_name} — ${storyInfo.total_num_chapters} chương, ${storyInfo.story_status}`);
  } else {
    storyInfo = JSON.parse(fs.readFileSync(introFile, 'utf8'));
    console.log(`Thông tin: ${storyInfo.story_name} (đã có)`);
  }

  let known = loadCache(cacheFile);
  if (totalPages) {
    await sleep(DELAY_MS);
    known = await discoverAllChapters(storyId, storySlug, totalPages, known, cacheFile);
  } else {
    console.log('   Chỉ có 1 trang danh sách chương, lấy từ trang truyện...');
    const batch = parseChapterLinksFromHtml(storyHtml, storySlug);
    Object.assign(known, batch);
    saveCache(cacheFile, known);
    console.log(`   Tìm thấy ${Object.keys(known).length} chương`);
  }

  console.log('\n' + '─'.repeat(52));
  console.log(`Discovery xong: ${Object.keys(known).length} chương`);
  console.log(`Cache: ${cacheFile}`);

  return { ok: true, storyInfo, chapterCount: Object.keys(known).length };
}

// ─── BƯỚC 2a: xác định danh sách chương cần tải ──────────────────────────────
// Thân hàm giống hệt đoạn tính downloadList cũ trong main() (bao gồm các console.log gốc).

function buildDownloadList(known, storyInfo, fromChapter, toChapter, errorCache) {
  const totalKnown = parseInt(storyInfo.total_num_chapters, 10) || null;
  const effectiveTo = toChapter === Infinity && totalKnown ? totalKnown : toChapter;
  const rangeLabel = effectiveTo === Infinity ? `${fromChapter} → hết` : `${fromChapter} → ${effectiveTo}`;
  console.log(`Khoảng  : ${rangeLabel}`);

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

  const downloadFailed = new Set(errorCache.download_failed || []);
  // Xóa khỏi site_gaps nếu chapter đã được cache sau lần discovery mới
  for (const n of [...siteGaps]) { if (known[n]) siteGaps.delete(n); }

  return { downloadList, siteGaps, downloadFailed, effectiveTo };
}

// ─── BƯỚC 2b: tải chương ──────────────────────────────────────────────────────
// Thân vòng lặp giống hệt for-loop cũ, chỉ đổi thành worker pool để hỗ trợ
// concurrency > 1 (app điều khiển); concurrency mặc định 1 giữ đúng thứ tự/])
// console output tuần tự như CLI trước đây. onEvent là hook cộng thêm (không
// thay thế) các dòng in ra màn hình hiện có — mặc định no-op nên CLI không đổi.

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
        downloadFailed.delete(num); // thành công trước đó, xóa khỏi error nếu có
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

      downloadFailed.delete(num); // xóa khỏi error nếu trước đó bị lỗi
      process.stdout.write(` OK — ${chapter.chapterNumber}: ${chapter.chapterName}\n`);
      success++;
      emit({ type: 'success', num, chapterLabel: chapter.chapterNumber, title: chapter.chapterName });
    }
  }

  const workerCount = Math.max(1, concurrency);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return { success, skipped, failed };
}

// ─── BƯỚC 2c: ghi/xóa file lỗi tổng hợp ───────────────────────────────────────
// Giống hệt đoạn ghi errorFile cũ ở cuối main(); trả thêm gapsArr/failedArr để
// nơi gọi tự in log theo nhu cầu (CLI in ra console, app điều khiển đẩy vào log realtime).

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
  fetchChapterListPage,
  loadCache,
  saveCache,
  extractStorySlug,
  parseStoryInfo,
  extractStoryId,
  extractTotalPages,
  parseChapterLinksFromHtml,
  parseChapter,
  discoverAllChapters,
  resolveStoryPaths,
  discoverStory,
  buildDownloadList,
  downloadChapters,
  finalizeErrorFile,
};
