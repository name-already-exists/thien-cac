import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { pickPaletteFor } from './palettes.js';

// ─── Env loader ───────────────────────────────────────────────────────────────

export function loadEnv(envPath) {
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

export function getDb() {
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

export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function extractChapterNum(chapterStr) {
  // "Chương 1000" → 1000
  const m = String(chapterStr).match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function countWords(content) {
  const trimmed = String(content).trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomRating() {
  return Math.round((Math.random() * (5 - 4.5) + 4.5) * 10) / 10;
}

export function mapStatus(rawStatus) {
  if (!rawStatus) return 'ongoing';
  const s = rawStatus.toLowerCase();
  if (s.includes('full') || s.includes('hoàn') || s.includes('complete')) return 'completed';
  return 'ongoing';
}

/** Dịch tên truyện sang Hán tự qua Google Translate (không cần API key). */
export async function translateToHan(text) {
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

// ─── DB operations ────────────────────────────────────────────────────────────

/** Tìm record theo name (hoặc slug nếu name chưa khớp); nếu không có thì tạo mới. Trả về id. */
export async function findOrCreate(table, name) {
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
export async function upsertStory({ slug, info, authorId, genreId, han }) {
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
export async function upsertChapter({ storyId, chapterNumber, title, wordCount, publishedAt }) {
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
export async function removeStory(slug) {
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
export async function upsertChapterContent({ chapterId, content }) {
  const db = getDb();
  const { data: existing } = await db
    .from('chapter_contents').select('chapter_id')
    .eq('chapter_id', chapterId).maybeSingle();

  const { error } = existing
    ? await db.from('chapter_contents').update({ content }).eq('chapter_id', chapterId)
    : await db.from('chapter_contents').insert({ chapter_id: chapterId, content });
  if (error) throw new Error(`Upsert chapter_content [${chapterId}]: ${error.message}`);
}

// ─── BƯỚC 2: Upsert author → genre → story ───────────────────────────────────
// Thân hàm giống hệt mục "2. Upsert author → genre → story" cũ trong main()
// (chỉ trừ phần rẽ nhánh --dry / --story-only, ở lại trong CLI vì ảnh hưởng
// control flow / process.exit).

export async function upsertStoryMetadata(slug, info, hanOverride) {
  process.stdout.write('Hán tự           ...');
  const han = hanOverride ?? await translateToHan(info.story_name);
  console.log(han ? ` ${han}${hanOverride ? ' (thủ công)' : ' (translate)'}` : ' không tìm được (bỏ qua)');

  process.stdout.write('Upsert tác giả   ...');
  const authorId = await findOrCreate('authors', info.author || 'Không rõ');
  console.log(` OK [id=${authorId}]`);

  process.stdout.write('Upsert thể loại  ...');
  const genreId = await findOrCreate('genres', info.genre || 'Tiên Hiệp');
  console.log(` OK [id=${genreId}]`);

  process.stdout.write('Upsert truyện    ...');
  const { id, isNew } = await upsertStory({ slug, info, authorId, genreId, han });
  console.log(` OK [id=${id}] ${isNew ? '(mới)' : '(cập nhật)'}`);

  return { storyId: id, isNew, han };
}

// ─── BƯỚC 3: xác định danh sách file chương cần import ───────────────────────

export function buildChapterFileList(storyDir, fromChapter, toChapter) {
  return fs.readdirSync(storyDir)
    .filter(f => /^\d+_chuong_\d+\.txt$/.test(f))
    .map(f => {
      const m = f.match(/^(\d+)_chuong_\d+\.txt$/);
      return { file: f, num: parseInt(m[1], 10) };
    })
    .filter(({ num }) => num >= fromChapter && num <= toChapter)
    .sort((a, b) => a.num - b.num);
}

// ─── BƯỚC 4: Import từng chương ───────────────────────────────────────────────
// Thân vòng lặp giống hệt for-loop cũ, chỉ đổi thành worker pool để hỗ trợ
// concurrency > 1 (app điều khiển); concurrency mặc định 1 giữ đúng thứ tự
// console output tuần tự như CLI trước đây. onEvent là hook cộng thêm (không
// thay thế) các dòng in ra màn hình hiện có — mặc định no-op nên CLI không đổi.

export async function importChapters(chapterFiles, { storyId, storyDir, dry, concurrency = 1, onEvent } = {}) {
  const emit = onEvent || (() => {});
  let success = 0, failed = 0;
  const now = new Date().toISOString();
  let cursor = 0;

  async function worker() {
    while (cursor < chapterFiles.length) {
      // Nhường event loop giữa mỗi chương — nhánh --dry bên dưới không có await
      // nào, nếu không có dòng này 1 story hàng nghìn chương ở chế độ dry sẽ chạy
      // đồng bộ liền mạch và làm treo cả server (không đổi output, chỉ vài ms).
      await new Promise((resolve) => setImmediate(resolve));

      const { file, num } = chapterFiles[cursor++];
      const filePath = path.join(storyDir, file);
      let raw;
      try {
        raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      } catch (err) {
        console.log(`   [${num}] LỖI đọc file: ${err.message}`);
        failed++;
        emit({ type: 'fail', num, reason: 'read', message: err.message });
        continue;
      }

      const chapterNum = extractChapterNum(raw.chapter_number) ?? num;
      const title      = capitalize(raw.chapter_name || '');
      const content    = raw.chapter_content || '';

      if (dry) {
        console.log(`   [${num}] [dry] ${raw.chapter_number}: ${title}`);
        success++;
        emit({ type: 'success', num, dry: true, title, chapterLabel: raw.chapter_number });
        continue;
      }

      try {
        const chapterId = await upsertChapter({ storyId, chapterNumber: chapterNum, title, wordCount: countWords(content), publishedAt: now });
        await upsertChapterContent({ chapterId, content });
        console.log(`   [${num}] OK — ${raw.chapter_number}: ${title}`);
        success++;
        emit({ type: 'success', num, title, chapterLabel: raw.chapter_number });
      } catch (err) {
        console.log(`   [${num}] LỖI: ${err.message}`);
        failed++;
        emit({ type: 'fail', num, reason: 'db', message: err.message });
      }
    }
  }

  const workerCount = Math.max(1, concurrency);
  await Promise.all(Array.from({ length: workerCount }, worker));

  return { success, failed };
}
