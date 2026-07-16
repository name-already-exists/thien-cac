const app = document.getElementById('app');
const addrEl = document.getElementById('addr');
addrEl.textContent = location.host;

const SOURCE_PATTERNS = [
  { id: 'metruyenchuvn', label: 'MeTruyenChuVN', re: /metruyenchuvn\.com/i },
  { id: 'truyenyy', label: 'TruyenYY', re: /truyenyy\.co/i },
  { id: 'khotruyenchu', label: 'KhoTruyenChu', re: /khotruyenchu\.fun/i },
];

function detectSourceClient(url) {
  if (!url) return null;
  return SOURCE_PATTERNS.find((s) => s.re.test(url)) || null;
}

const api = {
  async get(path) {
    const res = await fetch(`/api${path}`);
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json();
  },
  async send(method, path, body) {
    const res = await fetch(`/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json();
  },
  post(path, body) { return this.send('POST', path, body); },
  put(path, body) { return this.send('PUT', path, body); },
  del(path) { return this.send('DELETE', path); },
};

const state = {
  view: 'list',
  stories: [],
  selectedSlug: null,
  selected: null,
  addUrl: '',
  addSubmitting: false,
  settings: null,
  savedFlash: false,
};

let listPollTimer = null;
let detailSource = null;

function stopListPoll() {
  if (listPollTimer) { clearInterval(listPollTimer); listPollTimer = null; }
}

function stopDetailStream() {
  if (detailSource) { detailSource.close(); detailSource = null; }
}

function setView(view) {
  stopListPoll();
  stopDetailStream();
  state.view = view;
  if (view === 'list') {
    refreshStories();
    listPollTimer = setInterval(refreshStories, 3000);
  } else if (view === 'settings') {
    api.get('/settings').then((s) => { state.settings = s; render(); });
  }
  render();
}

async function refreshStories() {
  try {
    state.stories = await api.get('/stories');
  } catch (err) {
    console.error('Không tải được danh sách truyện:', err);
  }
  render();
}

function openStory(slug) {
  stopListPoll();
  state.view = 'detail';
  state.selectedSlug = slug;
  state.selected = null;
  render();

  api.get(`/stories/${slug}`).then((s) => { state.selected = s; render(); }).catch(() => {});

  stopDetailStream();
  detailSource = new EventSource(`/api/stories/${slug}/events`);
  detailSource.onmessage = (evt) => {
    try {
      state.selected = JSON.parse(evt.data);
      render();
    } catch { /* ignore malformed frame */ }
  };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

function startCrawl(slug, evt) { evt?.stopPropagation(); api.post(`/stories/${slug}/crawl`, {}).catch(console.error); }
function startImport(slug, evt) { evt?.stopPropagation(); api.post(`/stories/${slug}/import`, {}).catch(console.error); }
function startFull(slug, evt) { evt?.stopPropagation(); api.post(`/stories/${slug}/full`, {}).catch(console.error); }

async function removeStory(slug, title, evt) {
  evt?.stopPropagation();
  if (!window.confirm(`Xoá "${title}" khỏi Supabase? File local trong thien-dao/storage vẫn được giữ nguyên.`)) return;
  try {
    await api.del(`/stories/${slug}`);
    if (state.view === 'detail' && state.selectedSlug === slug) setView('list');
    else refreshStories();
  } catch (err) {
    alert(`Xoá thất bại: ${err.message}`);
  }
}

function retryChapter(slug, type, chapter) {
  api.post(`/stories/${slug}/retry`, { type, chapter }).catch(console.error);
}

function retryAll(slug) {
  api.post(`/stories/${slug}/retry-all`, {}).catch(console.error);
}

async function submitAdd() {
  const src = detectSourceClient(state.addUrl);
  if (!src) return;
  state.addSubmitting = true;
  render();
  try {
    const { slug } = await api.post('/stories', { url: state.addUrl });
    state.addUrl = '';
    state.addSubmitting = false;
    openStory(slug);
  } catch (err) {
    state.addSubmitting = false;
    alert(`Không thêm được truyện: ${err.message}`);
    render();
  }
}

async function saveSettings() {
  const s = await api.put('/settings', state.settings);
  state.settings = s;
  state.savedFlash = true;
  render();
  setTimeout(() => { state.savedFlash = false; render(); }, 1800);
}

// ─── Icons (inline SVG, giống mockup) ────────────────────────────────────────

const icon = {
  plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>',
  back: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>',
  trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  retry: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path><path d="M8 16H3v5"></path></svg>',
  check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><path d="m9 11 3 3L22 4"></path></svg>',
  alert: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ─── Render: list ─────────────────────────────────────────────────────────────

function renderList() {
  const cards = state.stories.map((s) => `
    <div class="story-card" data-open="${esc(s.slug)}">
      <div class="story-card__top">
        <div class="story-cover">
          <div class="story-cover__han">${esc(s.han)}</div>
          <div class="story-cover__dot"></div>
        </div>
        <div class="story-meta">
          <div class="story-title">${esc(s.title)}</div>
          <div class="story-slug">${esc(s.slug)}</div>
          <div class="story-badges">
            <span class="badge-source">${esc(s.sourceLabel)}</span>
            <span class="badge-status" style="color:${s.statusColor}">
              <span class="badge-status__dot" style="background:${s.statusColor}"></span>
              ${esc(s.statusLabel)}
            </span>
          </div>
        </div>
      </div>
      <div class="progress-block">
        <div>
          <div class="progress-row"><span>Crawl</span><span>${esc(s.crawlFraction)}</span></div>
          <div class="progress-track"><div class="progress-fill progress-fill--crawl" style="width:${s.crawlPctStr}"></div></div>
        </div>
        <div>
          <div class="progress-row"><span>Import</span><span>${esc(s.importFraction)}</span></div>
          <div class="progress-track"><div class="progress-fill progress-fill--import" style="width:${s.importPctStr}"></div></div>
        </div>
      </div>
      <div class="story-card__actions">
        <button class="btn btn-ghost" data-crawl="${esc(s.slug)}">Crawl</button>
        <button class="btn btn-ghost" data-import="${esc(s.slug)}">Import</button>
        <button class="btn btn-soft" data-full="${esc(s.slug)}">Full</button>
        <button class="btn btn-danger-ghost" data-remove="${esc(s.slug)}" data-title="${esc(s.title)}" title="Xoá khỏi Supabase">${icon.trash}</button>
      </div>
    </div>
  `).join('');

  app.innerHTML = `
    <div class="page-title-row">
      <div>
        <div class="page-title">Danh Sách Truyện</div>
        <div class="page-title-han">爬取與匯入</div>
      </div>
      <button class="btn btn-primary" id="go-add">${icon.plus} Thêm truyện mới</button>
    </div>
    <div class="story-grid">
      ${cards || '<div class="empty-state">Chưa có truyện nào. Bấm "Thêm truyện mới" để bắt đầu.</div>'}
    </div>
  `;

  app.querySelector('#go-add').addEventListener('click', () => setView('add'));
  app.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => openStory(el.dataset.open)));
  app.querySelectorAll('[data-crawl]').forEach((el) => el.addEventListener('click', (e) => startCrawl(el.dataset.crawl, e)));
  app.querySelectorAll('[data-import]').forEach((el) => el.addEventListener('click', (e) => startImport(el.dataset.import, e)));
  app.querySelectorAll('[data-full]').forEach((el) => el.addEventListener('click', (e) => startFull(el.dataset.full, e)));
  app.querySelectorAll('[data-remove]').forEach((el) => el.addEventListener('click', (e) => removeStory(el.dataset.remove, el.dataset.title, e)));
}

// ─── Render: detail ─────────────────────────────────────────────────────────

function renderDetail() {
  const s = state.selected;
  if (!s) { app.innerHTML = '<div class="empty-state">Đang tải…</div>'; return; }

  const logs = s.logsList.length
    ? s.logsList.map((l) => `<div class="log-line">${esc(l)}</div>`).join('')
    : '<div class="log-empty">Chưa có hoạt động — bấm Crawl / Import để bắt đầu.</div>';

  const errors = s.errorRows.length
    ? s.errorRows.map((e) => `
        <div class="error-row">
          ${icon.alert}
          <span class="error-row__label">${esc(e.label)}</span>
          <button class="error-row__retry" data-retry-type="${e.type}" data-retry-chapter="${e.chapter}">Retry</button>
        </div>
      `).join('')
    : '<div class="error-empty">Không có chương lỗi.</div>';

  app.innerHTML = `
    <button class="back-btn" id="go-list">${icon.back} Danh sách truyện</button>

    <div class="detail-head">
      <div class="detail-cover"><div class="detail-cover__han">${esc(s.han)}</div></div>
      <div>
        <div class="detail-title">${esc(s.title)}</div>
        <div class="detail-subline">
          <span class="badge-source">${esc(s.sourceLabel)}</span>
          <span style="font-family:var(--font-mono);">${esc(s.slug)}</span>
          <span style="font-weight:600;color:${s.statusColor}">· ${esc(s.statusLabel)}</span>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn btn-outline" id="d-crawl">Crawl</button>
        <button class="btn btn-outline" id="d-import">Import</button>
        <button class="btn btn-primary" id="d-full">Crawl + Import (full)</button>
        <button class="btn btn-danger-text" id="d-remove">Xoá khỏi Supabase</button>
      </div>
    </div>

    <div class="progress-cards">
      <div class="progress-card">
        <div class="progress-card__head">
          <div class="progress-card__title">Crawl</div>
          <div class="progress-card__pct progress-card__pct--crawl">${s.crawlPctStr}</div>
        </div>
        <div class="progress-card__track"><div class="progress-fill progress-fill--crawl" style="width:${s.crawlPctStr}"></div></div>
        <div class="progress-card__foot"><span>${esc(s.crawlFraction)} chương</span><span>${s.crawlErrorCount} lỗi</span></div>
      </div>
      <div class="progress-card">
        <div class="progress-card__head">
          <div class="progress-card__title">Import</div>
          <div class="progress-card__pct progress-card__pct--import">${s.importPctStr}</div>
        </div>
        <div class="progress-card__track"><div class="progress-fill progress-fill--import" style="width:${s.importPctStr}"></div></div>
        <div class="progress-card__foot"><span>${esc(s.importFraction)} chương</span><span>${s.importErrorCount} lỗi</span></div>
      </div>
    </div>

    <div class="detail-panels">
      <div class="log-panel">
        <div class="log-panel__title">Log realtime</div>
        ${logs}
      </div>
      <div class="error-panel">
        <div class="error-panel__head">
          <div class="error-panel__title">Chương lỗi</div>
          <button class="error-panel__retry-all" id="d-retry-all">${icon.retry} Retry tất cả lỗi</button>
        </div>
        <div class="error-panel__list">${errors}</div>
      </div>
    </div>
  `;

  app.querySelector('#go-list').addEventListener('click', () => setView('list'));
  app.querySelector('#d-crawl').addEventListener('click', () => startCrawl(s.slug));
  app.querySelector('#d-import').addEventListener('click', () => startImport(s.slug));
  app.querySelector('#d-full').addEventListener('click', () => startFull(s.slug));
  app.querySelector('#d-remove').addEventListener('click', () => removeStory(s.slug, s.title));
  app.querySelector('#d-retry-all').addEventListener('click', () => retryAll(s.slug));
  app.querySelectorAll('[data-retry-chapter]').forEach((el) => {
    el.addEventListener('click', () => retryChapter(s.slug, el.dataset.retryType, Number(el.dataset.retryChapter)));
  });

  const logPanel = app.querySelector('.log-panel');
  logPanel.scrollTop = logPanel.scrollHeight;
}

// ─── Render: add ──────────────────────────────────────────────────────────────

function renderAdd() {
  const detected = detectSourceClient(state.addUrl);
  const showUnknown = !!state.addUrl && !detected;

  app.innerHTML = `
    <div class="form-page">
      <div class="form-title">Thêm Truyện Mới</div>
      <div class="form-subtitle">Dán URL truyện — app tự nhận diện nguồn, discover, crawl và import.</div>
      <div class="form-card">
        <div class="field-label">URL truyện</div>
        <input type="text" class="text-input" id="add-url" placeholder="https://metruyenchuvn.com/truyen/..." value="${esc(state.addUrl)}"/>
        <div class="detect-row">
          ${detected ? `<div class="detect-ok">${icon.check} Đã nhận diện nguồn: ${esc(detected.label)}</div>` : ''}
          ${showUnknown ? `<div class="detect-bad">Không nhận diện được nguồn — hỗ trợ metruyenchuvn.com, truyenyy.co, khotruyenchu.fun</div>` : ''}
        </div>
        <button class="btn btn-primary submit-btn" id="add-submit" ${!detected || state.addSubmitting ? 'disabled' : ''}>
          ${state.addSubmitting ? 'Đang khởi động…' : 'Bắt đầu pipeline (Discover ▸ Crawl ▸ Import)'}
        </button>
        <div class="source-chips">
          <span class="source-chip">metruyenchuvn.com</span>
          <span class="source-chip">truyenyy.co</span>
          <span class="source-chip">khotruyenchu.fun</span>
        </div>
      </div>
    </div>
  `;

  const input = app.querySelector('#add-url');
  input.addEventListener('input', (e) => { state.addUrl = e.target.value; render(); input.focus(); input.selectionStart = input.selectionEnd = input.value.length; });
  app.querySelector('#add-submit').addEventListener('click', submitAdd);
}

// ─── Render: settings ───────────────────────────────────────────────────────

function renderSettings() {
  if (!state.settings) { app.innerHTML = '<div class="empty-state">Đang tải…</div>'; return; }
  const s = state.settings;

  app.innerHTML = `
    <div class="form-page">
      <div class="form-title">Cấu Hình Chung</div>
      <div class="form-card settings-block">
        <div>
          <div class="settings-row-head"><span>Số luồng song song</span><span>${s.concurrency}</span></div>
          <input type="range" min="1" max="8" step="1" value="${s.concurrency}" class="range-input" id="s-concurrency"/>
        </div>
        <div>
          <div class="field-label">Đường dẫn .env</div>
          <input type="text" class="text-input" id="s-env" value="${esc(s.envPath)}"/>
          <div class="field-hint">Ưu tiên đọc <span style="font-family:var(--font-mono);">SUPABASE_SERVICE_ROLE_KEY</span> từ file này.</div>
        </div>
        <div class="toggle-row">
          <div>
            <div class="toggle-row__title">Chế độ dry-run</div>
            <div class="toggle-row__desc">Chạy pipeline nhưng không ghi vào Supabase.</div>
          </div>
          <button class="toggle" id="s-dry" style="background:${s.dryRun ? 'var(--brand-primary)' : 'var(--border-2)'}">
            <span class="toggle__knob" style="left:${s.dryRun ? '21px' : '3px'}"></span>
          </button>
        </div>
        <button class="btn btn-primary save-btn" id="s-save">${state.savedFlash ? 'Đã lưu cấu hình ✓' : 'Lưu cấu hình'}</button>
      </div>
    </div>
  `;

  app.querySelector('#s-concurrency').addEventListener('input', (e) => { state.settings.concurrency = Number(e.target.value); render(); });
  app.querySelector('#s-env').addEventListener('change', (e) => { state.settings.envPath = e.target.value; });
  app.querySelector('#s-dry').addEventListener('click', () => { state.settings.dryRun = !state.settings.dryRun; render(); });
  app.querySelector('#s-save').addEventListener('click', saveSettings);
}

// ─── Root render ──────────────────────────────────────────────────────────────

function render() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.nav === state.view || (btn.dataset.nav === 'list' && state.view === 'detail'));
  });

  if (state.view === 'list') renderList();
  else if (state.view === 'detail') renderDetail();
  else if (state.view === 'add') renderAdd();
  else if (state.view === 'settings') renderSettings();
}

document.getElementById('brand-btn').addEventListener('click', () => setView('list'));
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => setView(btn.dataset.nav));
});

setView('list');
