#!/usr/bin/env node
/**
 * fix-cache.js
 * Re-scan toàn bộ trang AJAX, dùng TEXT link ("Chương 480") thay vì URL number
 * để tìm các chương bị bỏ sót do format URL không chuẩn.
 * Dùng: node fix-cache.js <story-url> <chapter1,chapter2,...>
 * VD:   node fix-cache.js https://metruyenchuvn.com/huyen-giam-tien-toc 480,637,690
 */
'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://metruyenchuvn.com';
const DELAY_MS = 1000;
const OUTPUT_BASE = path.join(__dirname, '../..');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 Chrome/120',
  'Accept-Language': 'vi-VN,vi;q=0.9',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}
function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

async function fetchPage(url, isAjax = false) {
  const headers = isAjax
    ? { ...HEADERS, 'X-Requested-With': 'XMLHttpRequest' }
    : HEADERS;
  const opts = isAjax
    ? { headers, timeout: 20000 }
    : { headers, responseType: 'arraybuffer', timeout: 20000 };
  const res = await axios.get(url, opts);
  return isAjax ? (res.data?.data || '') : res.data.toString('utf8');
}

// Parse chapter links dùng TEXT ("Chương 480: ...") thay vì URL number
function parseByText(html) {
  const $ = cheerio.load(html);
  const result = {}; // { chapterNum: url }

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();

    // Bỏ qua link không phải chapter
    if (!href.includes('/chuong-')) return;

    const m = text.match(/^Chương\s+(\d+)/i);
    if (!m) return;

    const num = parseInt(m[1], 10);
    const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
    if (!result[num]) result[num] = fullUrl;
  });

  return result;
}

async function main() {
  const [, , storyArg, chaptersArg] = process.argv;

  if (!storyArg || !chaptersArg) {
    console.log('Dùng: node fix-cache.js <story-url> <ch1,ch2,...>');
    process.exit(0);
  }

  const slug = new URL(storyArg.startsWith('http') ? storyArg : `https://${storyArg}`)
    .pathname.replace(/^\//, '').split('/')[0];

  const targets = new Set(chaptersArg.split(',').map(Number).filter(Boolean));
  const outputDir = path.join(OUTPUT_BASE, slug);
  const cacheFile = path.join(outputDir, '.cache.json');
  const errorFile = path.join(outputDir, '.cache-error.json');

  if (!fs.existsSync(cacheFile)) {
    console.error(`Không tìm thấy cache: ${cacheFile}`);
    process.exit(1);
  }

  // Lấy story ID + total pages từ trang truyện
  process.stdout.write(`Lấy story info cho ${slug}...`);
  const storyHtml = await fetchPage(`${BASE_URL}/${slug}`);
  const storyIdMatch = storyHtml.match(/page\((\d+)[,)]/);
  if (!storyIdMatch) { console.error('\nKhông tìm được story ID.'); process.exit(1); }
  const storyId = storyIdMatch[1];
  const pageMatches = [...storyHtml.matchAll(new RegExp(`page\\(${storyId},\\s*(\\d+)\\)`, 'g'))];
  const totalPages = pageMatches.length ? Math.max(...pageMatches.map(m => parseInt(m[1], 10))) : 1;
  console.log(` OK (ID: ${storyId}, ${totalPages} trang)`);

  // Re-scan tất cả trang AJAX dùng text-based matching
  console.log(`\nRe-scanning ${totalPages} trang (text-based)...`);
  const foundByText = {}; // { num: url } — tất cả chương tìm được qua text

  for (let page = 1; page <= totalPages; page++) {
    process.stdout.write(`\r  Trang ${page}/${totalPages}...`);
    await sleep(DELAY_MS);
    try {
      const html = await fetchPage(`${BASE_URL}/get/listchap/${storyId}?page=${page}`, true);
      const batch = parseByText(html);
      for (const [num, url] of Object.entries(batch)) {
        if (!foundByText[num]) foundByText[num] = url;
      }
    } catch (e) {
      process.stdout.write(` [lỗi trang ${page}: ${e.message}]`);
    }
  }
  process.stdout.write('\n');
  console.log(`  Tổng tìm được (text-based): ${Object.keys(foundByText).length} chương\n`);

  // So sánh với target list
  const cache = loadJson(cacheFile);
  const errorCache = loadJson(errorFile);
  const stillMissing = [];
  const recovered = [];

  for (const num of [...targets].sort((a, b) => a - b)) {
    if (foundByText[num]) {
      if (!cache[num] || cache[num] !== foundByText[num]) {
        cache[num] = foundByText[num];
        recovered.push(num);
        console.log(`  ✓ Tìm thấy chương ${num}: ${foundByText[num]}`);
      } else {
        console.log(`  ~ Chương ${num}: đã có trong cache (không đổi)`);
      }
    } else {
      stillMissing.push(num);
      console.log(`  ✗ Chương ${num}: thực sự không tồn tại trên site`);
    }
  }

  // Cập nhật cache
  if (recovered.length > 0) {
    saveJson(cacheFile, cache);
    console.log(`\n✓ Đã cập nhật cache: ${recovered.length} chương mới (${recovered.slice(0, 5).join(', ')}${recovered.length > 5 ? '...' : ''})`);
  } else {
    console.log('\nKhông có chương nào được phục hồi.');
  }

  // Cập nhật error file
  const siteGaps = [...new Set([...(errorCache.site_gaps || []), ...stillMissing])].sort((a, b) => a - b);
  // Xóa các chapter đã phục hồi khỏi site_gaps
  const updatedGaps = siteGaps.filter(n => !recovered.includes(n));
  const updatedFailed = (errorCache.download_failed || []).filter(n => !recovered.includes(n));

  if (updatedGaps.length > 0 || updatedFailed.length > 0) {
    saveJson(errorFile, { site_gaps: updatedGaps, download_failed: updatedFailed });
    console.log(`✓ Cập nhật error file: ${updatedGaps.length} site_gaps, ${updatedFailed.length} download_failed`);
  } else if (fs.existsSync(errorFile)) {
    fs.unlinkSync(errorFile);
    console.log('✓ Xóa error file (không còn lỗi).');
  }

  console.log(`\nKết quả: ${recovered.length} phục hồi, ${stillMissing.length} thực sự không có trên site`);
  if (stillMissing.length > 0) {
    console.log(`Site gaps: ${stillMissing.join(', ')}`);
  }
}

main().catch(err => { console.error('Lỗi:', err.message); process.exit(1); });
