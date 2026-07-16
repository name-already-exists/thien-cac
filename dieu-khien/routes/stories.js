import express from 'express';
import { detectSource, sourceLabel } from '../sources.js';
import * as state from '../state.js';
import * as pipeline from '../pipeline.js';
import { removeStory } from '../../ngoc-gian/lib.js';

const router = express.Router();

function toViewModel(story) {
  const crawlPct = story.crawl.total ? Math.round((story.crawl.done / story.crawl.total) * 100) : 0;
  const importPct = story.import.total ? Math.round((story.import.done / story.import.total) * 100) : 0;

  let statusLabel, statusColor;
  if (story.crawlRunning) { statusLabel = 'Đang crawl…'; statusColor = 'var(--info)'; }
  else if (story.importRunning) { statusLabel = 'Đang import…'; statusColor = 'var(--info)'; }
  else if (crawlPct >= 100 && importPct >= 100 && story.crawl.errors.length === 0 && story.importErrors.length === 0) {
    statusLabel = 'Hoàn tất'; statusColor = 'var(--success)';
  } else if (story.crawl.errors.length || story.importErrors.length) {
    statusLabel = 'Có lỗi'; statusColor = 'var(--danger)';
  } else if (crawlPct === 0 && importPct === 0) {
    statusLabel = 'Chưa bắt đầu'; statusColor = 'var(--fg-3)';
  } else {
    statusLabel = 'Tạm dừng'; statusColor = 'var(--warning)';
  }

  const errorRows = [
    ...story.crawl.errors.map((ch) => ({ type: 'crawl', chapter: ch, label: `Chương ${ch} (crawl)` })),
    ...story.importErrors.map((ch) => ({ type: 'import', chapter: ch, label: `Chương ${ch} (import)` })),
  ];

  return {
    slug: story.slug,
    title: story.title,
    han: story.han || '書',
    sourceId: story.sourceId,
    sourceLabel: sourceLabel(story.sourceId),
    statusLabel,
    statusColor,
    crawlPctStr: `${crawlPct}%`,
    importPctStr: `${importPct}%`,
    crawlFraction: `${story.crawl.done}/${story.crawl.total}`,
    importFraction: `${story.import.done}/${story.import.total}`,
    crawlErrorCount: story.crawl.errors.length,
    importErrorCount: story.importErrors.length,
    crawlRunning: story.crawlRunning,
    importRunning: story.importRunning,
    logsList: story.logs.map((l) => l.text),
    noLogs: story.logs.length === 0,
    errorRows,
    noErrors: errorRows.length === 0,
  };
}

async function loadStories() {
  const local = state.scanLocalStories();
  const enriched = await state.enrichWithSupabase(local);
  return enriched.map(toViewModel);
}

/** Chỉ tải + làm giàu 1 truyện — dùng cho trang chi tiết/SSE, tránh quét toàn bộ
 * thien-dao/storage (có thể hàng nghìn file) mỗi lần 1 event tiến độ bắn ra. */
async function loadStory(slug) {
  const local = state.scanLocalStory(slug);
  if (!local) return null;
  const [enriched] = await state.enrichWithSupabase([local]);
  return toViewModel(enriched);
}

router.get('/stories', async (req, res, next) => {
  try {
    res.json(await loadStories());
  } catch (err) { next(err); }
});

router.get('/stories/:slug', async (req, res, next) => {
  try {
    const story = await loadStory(req.params.slug);
    if (!story) return res.status(404).json({ error: 'Không tìm thấy truyện' });
    res.json(story);
  } catch (err) { next(err); }
});

router.post('/stories', async (req, res, next) => {
  try {
    const { url } = req.body || {};
    const sourceId = detectSource(url);
    if (!sourceId) return res.status(400).json({ error: 'Không nhận diện được nguồn từ URL' });

    const result = await pipeline.runDiscover(sourceId, url);
    if (!result.ok) return res.status(502).json({ error: `Discover thất bại: ${result.reason}` });

    state.setRunning(result.slug, { pendingFull: true });
    pipeline.runCrawl(result.slug, { from: 1, to: Infinity }).catch((err) => {
      state.pushLog(result.slug, `✗ Lỗi pipeline: ${err.message}`);
      state.setRunning(result.slug, { crawlRunning: false, importRunning: false, pendingFull: false });
    });

    res.status(202).json({ slug: result.slug });
  } catch (err) { next(err); }
});

router.post('/stories/:slug/crawl', (req, res) => {
  const { from, to } = req.body || {};
  pipeline.runCrawl(req.params.slug, {
    from: from ? Number(from) : 1,
    to: to ? Number(to) : Infinity,
  }).catch((err) => state.pushLog(req.params.slug, `✗ Lỗi crawl: ${err.message}`));
  res.status(202).json({ ok: true });
});

router.post('/stories/:slug/import', (req, res) => {
  const { from, to, storyOnly } = req.body || {};
  pipeline.runImport(req.params.slug, {
    from: from ? Number(from) : 1,
    to: to ? Number(to) : Infinity,
    storyOnly: !!storyOnly,
  }).catch((err) => state.pushLog(req.params.slug, `✗ Lỗi import: ${err.message}`));
  res.status(202).json({ ok: true });
});

router.post('/stories/:slug/full', (req, res) => {
  const slug = req.params.slug;
  state.setRunning(slug, { pendingFull: true });
  pipeline.runCrawl(slug, { from: 1, to: Infinity }).catch((err) => {
    state.pushLog(slug, `✗ Lỗi pipeline: ${err.message}`);
    state.setRunning(slug, { crawlRunning: false, importRunning: false, pendingFull: false });
  });
  res.status(202).json({ ok: true });
});

router.post('/stories/:slug/retry', (req, res) => {
  const { type, chapter } = req.body || {};
  pipeline.retryChapter(req.params.slug, { type, chapter: Number(chapter) })
    .catch((err) => state.pushLog(req.params.slug, `✗ Lỗi retry: ${err.message}`));
  res.status(202).json({ ok: true });
});

router.post('/stories/:slug/retry-all', (req, res) => {
  pipeline.retryAll(req.params.slug)
    .catch((err) => state.pushLog(req.params.slug, `✗ Lỗi retry-all: ${err.message}`));
  res.status(202).json({ ok: true });
});

router.delete('/stories/:slug', async (req, res, next) => {
  try {
    const result = await removeStory(req.params.slug);
    if (!result) return res.status(404).json({ error: 'Không tìm thấy truyện trong Supabase' });
    state.pushLog(req.params.slug, `— Đã xoá khỏi Supabase (giữ file local) —`);
    res.json({ ok: true, ...result });
  } catch (err) { next(err); }
});

router.get('/stories/:slug/events', (req, res) => {
  const slug = req.params.slug;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');

  const send = async () => {
    try {
      const story = await loadStory(slug);
      if (story) res.write(`data: ${JSON.stringify(story)}\n\n`);
    } catch {
      // bỏ qua lỗi tạm thời, thử lại ở event kế tiếp
    }
  };

  // Crawl/import có thể bắn hàng trăm event tiến độ mỗi giây (vd khi bỏ qua
  // hàng loạt chương đã tải) — throttle để không tính lại + query Supabase
  // dồn dập, tối đa 1 lần mỗi 400ms (trailing edge, luôn gửi bản mới nhất).
  let sending = false;
  let pending = false;
  const throttledSend = () => {
    if (sending) { pending = true; return; }
    sending = true;
    send().finally(() => {
      setTimeout(() => {
        sending = false;
        if (pending) { pending = false; throttledSend(); }
      }, 400);
    });
  };

  const onEvent = () => { throttledSend(); };
  state.bus.on(slug, onEvent);
  send();

  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    state.bus.off(slug, onEvent);
  });
});

export default router;
