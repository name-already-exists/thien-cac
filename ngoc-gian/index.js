#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  getDb,
  upsertStoryMetadata,
  buildChapterFileList,
  importChapters,
  removeStory,
} from './lib.js';

const __dirname      = path.dirname(fileURLToPath(import.meta.url));
const THIEN_DAO_BASE = path.join(__dirname, '../thien-dao/storage');

// ─── CLI args ─────────────────────────────────────────────────────────────────

function parseArgs() {
  const args   = process.argv.slice(2);
  const result = { slug: null, from: null, to: null, chapter: null, env: null, han: null, dry: false, remove: false, yes: false, storyOnly: false };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if      (a === '--from'        && args[i + 1]) result.from       = parseInt(args[++i], 10);
    else if (a === '--to'          && args[i + 1]) result.to         = parseInt(args[++i], 10);
    else if (a === '--chapter'     && args[i + 1]) result.chapter    = parseInt(args[++i], 10);
    else if (a === '--env'         && args[i + 1]) result.env        = args[++i];
    else if (a === '--han'         && args[i + 1]) result.han        = args[++i];
    else if (a === '--dry')                        result.dry        = true;
    else if (a === '--remove')                     result.remove     = true;
    else if (a === '--yes')                        result.yes        = true;
    else if (a === '--story-only')                 result.storyOnly  = true;
    else if (!a.startsWith('-'))                   result.slug       = a;
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
  --story-only  Chỉ upsert metadata truyện (tác giả, thể loại, truyện), không import chương
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

function confirmPrompt(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
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
    const result = await upsertStoryMetadata(args.slug, info, args.han);
    storyId = result.storyId;

    if (args.storyOnly) {
      console.log('\n' + '─'.repeat(52));
      console.log(`Story ID: ${storyId} — metadata đã upsert xong.`);
      return;
    }
  } else {
    console.log('[dry] bỏ qua dịch Hán tự / upsert tác giả / thể loại / truyện');
  }

  // ── 3. Xác định khoảng chương ────────────────────────────────────
  let fromChapter = args.from    ?? 1;
  let toChapter   = args.to      ?? Infinity;
  if (args.chapter !== null) { fromChapter = args.chapter; toChapter = args.chapter; }

  const chapterFiles = buildChapterFileList(storyDir, fromChapter, toChapter);

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
  const { success, failed } = await importChapters(chapterFiles, { storyId, storyDir, dry: args.dry, concurrency: 1 });

  // ── 5. Tổng kết ───────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(52));
  console.log(`Hoàn thành: ${success} thành công | ${failed} thất bại`);
  if (storyId) console.log(`Story ID  : ${storyId}`);
}

main().catch(err => {
  console.error('\nLỗi:', err.message);
  process.exit(1);
});
