#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { pickPaletteFor } from './palettes.js';

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const THIEN_DAO_BASE = path.join(__dirname, '../thien-dao');

// ─── Env loader ───────────────────────────────────────────────────────────────

function loadEnv(envPath) {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val   = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // file không tồn tại — dùng biến môi trường sẵn có
  }
}

// ─── Supabase client (lazy) ───────────────────────────────────────────────────

let _db = null;

function getDb() {
  if (_db) return _db;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error(
      'Thiếu biến môi trường.\n' +
      'Cần: NEXT_PUBLIC_SUPABASE_URL  và  SUPABASE_SERVICE_ROLE_KEY (hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY)'
    );
    process.exit(1);
  }
  _db = createClient(url, key, { realtime: { transport: WebSocket } });
  return _db;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractChapterNum(chapterStr) {
  // "Chương 1000" → 1000
  const m = String(chapterStr).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function countWords(content) {
  const trimmed = String(content).trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomRating() {
  return Math.round((Math.random() * (5 - 4.5) + 4.5) * 10) / 10;
}

function mapStatus(rawStatus) {
  if (!rawStatus) return 'ongoing';
  const s = rawStatus.toLowerCase();
  if (s.includes('full') || s.includes('hoàn') || s.includes('complete')) return 'completed';
  return 'ongoing';
}

/** Dịch tên truyện sang Hán tự qua Google Translate (không cần API key). */
async function translateToHan(text) {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const json = await res.json();
    // Response: [ [ ["translated", "original", ...], ... ], ... ]
    const translated = json?.[0]?.map(seg => seg?.[0] ?? '').join('').trim();
    return translated || '';
  } catch {
    return '';
  }
}

function confirmPrompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ─── DB operations ────────────────────────────────────────────────────────────

/** Tìm record theo name (hoặc slug nếu name chưa khớp); nếu không có thì tạo mới. Trả về id. */
async function findOrCreate(table, name) {
  const db   = getDb();
  const slug = slugify(name);

  const { data: byName } = await db.from(table).select('id').eq('name', name).maybeSingle();
  if (byName) return byName.id;

  const { data: bySlug } = await db.from(table).select('id').eq('slug', slug).maybeSingle();
  if (bySlug) return bySlug.id;

  const { data, error } = await db.from(table).insert({ name, slug }).select('id').single();
  if (error) throw new Error(`Insert ${table} "${name}": ${error.message}`);
  return data.id;
}

/**
 * Nếu story đã có (theo slug): bỏ qua, không update.
 * Nếu chưa có: tạo mới với default cho các field không có dữ liệu.
 * Trả về { id, isNew }.
 */
async function upsertStory({ slug, info, authorId, genreId, han }) {
  const db = getDb();
  const { data: existing } = await db.from('stories').select('id').eq('slug', slug).maybeSingle();

  if (existing) {
    return { id: existing.id, isNew: false };
  }

  const { data, error } = await db.from('stories').insert({
    slug,
    title:         info.story_name,
    description:   info.description  || '',
    status:        mapStatus(info.story_status),
    chapter_count: parseInt(info.total_num_chapters, 10) || 0,
    author_id:     authorId,
    genre_id:      genreId,
    han:           han,
    han_short:     han,
    han1: '', han2: '',
    word_count:    randomInt(500000, 3000000),
    reader_count:  randomInt(1000, 50000),
    review_count:  randomInt(10, 500),
    rating:        randomRating(),
    is_featured:   false,
    weekly_views:  randomInt(100, 5000),
    monthly_views: randomInt(5000, 20000),
    palette:    pickPaletteFor(info.story_name, info.description),
    seal_color: '#8B2331',
  }).select('id').single();
  if (error) throw new Error(`Insert story: ${error.message}`);
  return { id: data.id, isNew: true };
}

/**
 * Nếu chapter đã có (story_id + chapter_number): cập nhật title.
 * Nếu chưa có: tạo mới. Trả về chapter id.
 */
async function upsertChapter({ storyId, chapterNumber, title, wordCount, publishedAt }) {
  const db = getDb();
  const { data: existing } = await db
    .from('chapters').select('id')
    .eq('story_id', storyId).eq('chapter_number', chapterNumber)
    .maybeSingle();

  if (existing) {
    const { error } = await db.from('chapters')
      .update({ title, word_count: wordCount, is_published: true })
      .eq('id', existing.id);
    if (error) throw new Error(`Update chapter ${chapterNumber}: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await db.from('chapters').insert({
    story_id:       storyId,
    chapter_number: chapterNumber,
    title,
    word_count:     wordCount,
    is_published:   true,
    published_at:   publishedAt,
  }).select('id').single();
  if (error) throw new Error(`Insert chapter ${chapterNumber}: ${error.message}`);
  return data.id;
}

/** Xóa truyện + toàn bộ chương + nội dung chương theo slug. Trả về null nếu không tìm thấy. */
async function removeStory(slug) {
  const db = getDb();
  const { data: story, error: findErr } = await db.from('stories').select('id, title').eq('slug', slug).maybeSingle();
  if (findErr) throw new Error(`Tìm truyện: ${findErr.message}`);
  if (!story) return null;

  const { data: chapters, error: chErr } = await db.from('chapters').select('id').eq('story_id', story.id);
  if (chErr) throw new Error(`Lấy danh sách chương: ${chErr.message}`);
  const chapterIds = (chapters || []).map(c => c.id);

  if (chapterIds.length > 0) {
    const { error: contentErr } = await db.from('chapter_contents').delete().in('chapter_id', chapterIds);
    if (contentErr) throw new Error(`Xóa nội dung chương: ${contentErr.message}`);

    const { error: chapDelErr } = await db.from('chapters').delete().eq('story_id', story.id);
    if (chapDelErr) throw new Error(`Xóa chương: ${chapDelErr.message}`);
  }

  const { error: storyDelErr } = await db.from('stories').delete().eq('id', story.id);
  if (storyDelErr) throw new Error(`Xóa truyện: ${storyDelErr.message}`);

  return { id: story.id, title: story.title, chapterCount: chapterIds.length };
}

/** Upsert nội dung chương (1-1 với chapters). */
async function upsertChapterContent({ chapterId, content }) {
  const db = getDb();
  const { data: existing } = await db
    .from('chapter_contents').select('chapter_id')
    .eq('chapter_id', chapterId).maybeSingle();

  const { error } = existing
    ? await db.from('chapter_contents').update({ content }).eq('chapter_id', chapterId)
    : await db.from('chapter_contents').insert({ chapter_id: chapterId, content });
  if (error) throw new Error(`Upsert chapter_content [${chapterId}]: ${error.message}`);
}

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args   = process.argv.slice(2);
  const result = { slug: null, from: null, to: null, chapter: null, env: null, han: null, dry: false, remove: false, yes: false };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if      (a === '--from'    && args[i + 1]) result.from    = parseInt(args[++i], 10);
    else if (a === '--to'      && args[i + 1]) result.to      = parseInt(args[++i], 10);
    else if (a === '--chapter' && args[i + 1]) result.chapter = parseInt(args[++i], 10);
    else if (a === '--env'     && args[i + 1]) result.env     = args[++i];
    else if (a === '--han'     && args[i + 1]) result.han     = args[++i];
    else if (a === '--dry')                    result.dry     = true;
    else if (a === '--remove')                 result.remove  = true;
    else if (a === '--yes')                    result.yes     = true;
    else if (!a.startsWith('-'))               result.slug    = a;
  }

  return result;
}

function printHelp() {
  console.log(`
Import truyện từ thư mục thien-dao vào Supabase
────────────────────────────────────────────────────
Cách dùng:
  node index.js <story-slug> [options]

Options:
  --from N      Import từ chương N trở đi
  --to N        Import đến chương N (bao gồm)
  --chapter N   Chỉ import đúng chương N
  --han "仙逆"  Tên Hán tự (nếu không có, tự dịch qua Google Translate)
  --env path    Đường dẫn file .env (mặc định: ../.env.local)
  --dry         Chỉ đọc file, không ghi vào DB
  --remove      Xóa truyện (và toàn bộ chương + nội dung) khỏi Supabase
  --yes         Bỏ qua xác nhận khi dùng --remove

Ví dụ:
  node index.js tien-nghich
  node index.js tien-nghich --from 1 --to 100
  node index.js tien-nghich --from 101 --to 200
  node index.js tien-nghich --chapter 50
  node index.js huyen-giam-tien-toc --from 1 --to 500
  node index.js tien-nghich --remove
  node index.js tien-nghich --remove --yes

Lưu ý:
  - Đọc dữ liệu từ:   thien-dao/<slug>/
  - Chương đã có sẽ được cập nhật (upsert)
  - --remove chỉ xóa trong Supabase, KHÔNG xóa file local trong thien-dao/<slug>/
  - Biến môi trường cần thiết:
      NEXT_PUBLIC_SUPABASE_URL
      SUPABASE_SERVICE_ROLE_KEY   ← ưu tiên (hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY)
`);
}

// ─── Remove story ─────────────────────────────────────────────────────────────

async function runRemove(slug, skipConfirm) {
  console.log(`\nTruyện  : ${slug}`);
  console.log('Chế độ  : --remove (xóa truyện khỏi Supabase)');
  console.log('─'.repeat(52));

  const db = getDb();
  const { data: story, error: findErr } = await db.from('stories').select('id, title').eq('slug', slug).maybeSingle();
  if (findErr) { console.error(`Lỗi tìm truyện: ${findErr.message}`); process.exit(1); }
  if (!story) { console.log('Không tìm thấy truyện trong DB (slug không khớp).'); process.exit(0); }

  const { count: chapterCount, error: countErr } = await db
    .from('chapters').select('id', { count: 'exact', head: true }).eq('story_id', story.id);
  if (countErr) { console.error(`Lỗi đếm chương: ${countErr.message}`); process.exit(1); }

  console.log(`Tên      : ${story.title}`);
  console.log(`Số chương: ${chapterCount ?? 0}`);

  if (!skipConfirm) {
    const answer = await confirmPrompt(
      `\nXóa VĨNH VIỄN truyện "${story.title}" và toàn bộ ${chapterCount ?? 0} chương? (gõ "yes" để xác nhận): `
    );
    if (answer !== 'yes') { console.log('Đã hủy.'); process.exit(0); }
  }

  process.stdout.write('\nĐang xóa...');
  try {
    const result = await removeStory(slug);
    console.log(' OK');
    console.log('\n' + '─'.repeat(52));
    console.log(`Hoàn thành: đã xóa "${result.title}" (${result.chapterCount} chương).`);
  } catch (err) {
    console.log(' THẤT BẠI');
    console.error(`Lỗi: ${err.message}`);
    process.exit(1);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs();
  if (!args.slug) { printHelp(); process.exit(0); }

  loadEnv(args.env || path.join(__dirname, '../.env.local'));

  if (args.remove) {
    await runRemove(args.slug, args.yes);
    return;
  }

  const storyDir = path.join(THIEN_DAO_BASE, args.slug);
  if (!fs.existsSync(storyDir)) {
    console.error(`Không tìm thấy thư mục: ${storyDir}`);
    process.exit(1);
  }

  console.log(`\nTruyện  : ${args.slug}`);
  console.log(`Nguồn   : ${storyDir}`);
  if (args.dry) console.log('Chế độ  : --dry (không ghi DB)');
  console.log('─'.repeat(52));

  // ── 1. Đọc 0_gioi_thieu.txt ──────────────────────────────────────
  const introFile = path.join(storyDir, '0_gioi_thieu.txt');
  if (!fs.existsSync(introFile)) {
    console.error(`Không tìm thấy: ${introFile}`);
    process.exit(1);
  }
  const info = JSON.parse(fs.readFileSync(introFile, 'utf8'));
  console.log(`Tên     : ${info.story_name}`);
  console.log(`Tác giả : ${info.author}`);
  console.log(`Thể loại: ${info.genre}`);
  console.log(`Trạng TT: ${info.story_status}`);

  // ── 2. Upsert author → genre → story ─────────────────────────────
  let storyId;
  if (!args.dry) {
    process.stdout.write('Hán tự           ...');
    const han = args.han ?? await translateToHan(info.story_name);
    console.log(han ? ` ${han}${args.han ? ' (thủ công)' : ' (translate)'}` : ' không tìm được (bỏ qua)');

    process.stdout.write('Upsert tác giả   ...');
    const authorId = await findOrCreate('authors', info.author || 'Không rõ');
    console.log(` OK [id=${authorId}]`);

    process.stdout.write('Upsert thể loại  ...');
    const genreId = await findOrCreate('genres', info.genre || 'Tiên Hiệp');
    console.log(` OK [id=${genreId}]`);

    process.stdout.write('Upsert truyện    ...');
    const { id, isNew } = await upsertStory({ slug: args.slug, info, authorId, genreId, han });
    storyId = id;
    console.log(` OK [id=${storyId}] ${isNew ? '(mới)' : '(cập nhật)'}`);
  } else {
    console.log('[dry] bỏ qua dịch Hán tự / upsert tác giả / thể loại / truyện');
  }

  // ── 3. Xác định khoảng chương ────────────────────────────────────
  let fromChapter = args.from    ?? 1;
  let toChapter   = args.to      ?? Infinity;
  if (args.chapter !== null) { fromChapter = args.chapter; toChapter = args.chapter; }

  const chapterFiles = fs.readdirSync(storyDir)
    .filter(f => /^\d+_chuong_\d+\.txt$/.test(f))
    .map(f => {
      const m = f.match(/^(\d+)_chuong_\d+\.txt$/);
      return { file: f, num: parseInt(m[1], 10) };
    })
    .filter(({ num }) => num >= fromChapter && num <= toChapter)
    .sort((a, b) => a.num - b.num);

  if (chapterFiles.length === 0) {
    console.log('\nKhông có chương nào trong khoảng đã chọn.');
    process.exit(0);
  }

  const lastNum    = chapterFiles[chapterFiles.length - 1].num;
  const rangeLabel = toChapter === Infinity
    ? `${fromChapter} → ${lastNum}`
    : `${fromChapter} → ${toChapter}`;
  console.log(`\nKhoảng  : ${rangeLabel} (${chapterFiles.length} chương)`);
  console.log('\nBắt đầu import...\n');

  // ── 4. Import từng chương ─────────────────────────────────────────
  let success = 0, failed = 0;
  const now = new Date().toISOString();

  for (const { file, num } of chapterFiles) {
    const filePath = path.join(storyDir, file);
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) {
      console.log(`   [${num}] LỖI đọc file: ${err.message}`);
      failed++;
      continue;
    }

    const chapterNum = extractChapterNum(raw.chapter_number) ?? num;
    const title      = capitalize(raw.chapter_name || '');
    const content    = raw.chapter_content || '';

    if (args.dry) {
      console.log(`   [${num}] [dry] ${raw.chapter_number}: ${title}`);
      success++;
      continue;
    }

    try {
      const chapterId = await upsertChapter({ storyId, chapterNumber: chapterNum, title, wordCount: countWords(content), publishedAt: now });
      await upsertChapterContent({ chapterId, content });
      console.log(`   [${num}] OK — ${raw.chapter_number}: ${title}`);
      success++;
    } catch (err) {
      console.log(`   [${num}] LỖI: ${err.message}`);
      failed++;
    }
  }

  // ── 5. Tổng kết ───────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(52));
  console.log(`Hoàn thành: ${success} thành công | ${failed} thất bại`);
  if (storyId) console.log(`Story ID  : ${storyId}`);
}

main().catch(err => {
  console.error('\nLỗi:', err.message);
  process.exit(1);
});
