---
name: run-dieu-khien
description: Start, stop, and smoke-test the dieu-khien local web dashboard (Express + SSE app that orchestrates crawl + import for thien-dao/ngoc-gian). Use when asked to run, start, stop, restart, or verify the "app điều khiển" / "dieu-khien" app.
---

# Run dieu-khien (Bảng Điều Khiển)

Local Express app at `dieu-khien/` (see `dieu-khien/README.md` for the full user-facing
guide). This skill covers the operational mechanics: starting it, confirming it's actually
serving, and stopping it cleanly — with the Windows-specific gotchas already worked out.

## Start

```bash
cd dieu-khien
node server.js > /tmp/dieu-khien-server.log 2>&1 &
sleep 2
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4000/
```

- Works from any cwd since all paths in `server.js` resolve via `import.meta.url`, not
  `process.cwd()` — but `npm start`/`npm run dev` require running inside `dieu-khien/` for
  npm script resolution. `node server.js` (or `node dieu-khien/server.js` from repo root)
  works either way.
- Default port **4000**. Override with `PORT=5000 node server.js` if 4000 is taken.
- Requires `.env.local` at repo root (Supabase creds) for the Import side to actually write
  data — the app still starts and serves the crawl side fine without it; Supabase-backed
  fields just degrade to zeros (see `enrichWithSupabase` in `dieu-khien/state.js`).
- Don't `sleep 5` blindly — poll: `until curl -sf http://localhost:4000/ >/dev/null; do sleep 1; done`
  (capped, e.g. `timeout 30 bash -c '...'`).
- Check `dieu-khien/.settings.json` doesn't get clobbered — it's the persisted concurrency/
  envPath/dryRun config, gitignored, created on first `PUT /api/settings` (or defaults are
  used if absent).

## Verify it's actually running (not just bound)

```bash
curl -s http://localhost:4000/api/stories | node -e "
let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
  const s = JSON.parse(d); console.log('stories:', s.length);
});"
```

For a visual check, this repo has Playwright in the **root** `node_modules` (not
`dieu-khien/node_modules`) — write the driver script and run it from the **repo root**
(`d:/MISC/AAA/thien-cac`), otherwise `import { chromium } from 'playwright'` fails with
`ERR_MODULE_NOT_FOUND` (Node resolves `node_modules` from the script's own directory, and a
scratchpad/tmp dir has none). `chromium-cli` is not installed in this environment — use a
plain Playwright script instead, e.g.:

```js
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto('http://localhost:4000');
await page.waitForSelector('.story-card', { timeout: 10000 }); // list view's story cards
await page.screenshot({ path: 'C:/path/to/shot.png' });
await browser.close();
```

Run with `node <script>.mjs` from `d:/MISC/AAA/thien-cac`, then read the screenshot with the
Read tool. `.story-card` only appears once `GET /api/stories` resolves — the initial paint is
an empty-state message, so `waitForSelector`/Playwright's auto-waiting `click()` is required;
a bare `waitForTimeout(500)` right after page load can race the fetch and show a false empty
list.

## Stop

The shell here is Git Bash on Windows — `pkill`/plain `kill -f` are **not available**
(`pkill: command not found`). Use PowerShell via the Bash tool instead:

```bash
powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId, CommandLine"
```

Find the row whose `CommandLine` is `server.js` (or ends in `dieu-khien\server.js`), then:

```bash
powershell -NoProfile -Command "Stop-Process -Id <PID> -Force"
```

Avoid building the PowerShell one-liner with `Where-Object { ... $($_.ProcessId) ... }` and
string interpolation inside a **double-quoted** Bash `-Command` string — Bash's own `$(...)`
command substitution fires first and mangles it. Two-step (list, then kill by literal PID) is
more reliable than a single filtered kill command from this tool.

Confirm it's down:

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 3 http://localhost:4000/ || echo "stopped"
```
(`000`/curl error = stopped; `200` = still running.)

## Known non-issue: Node internal crash under concurrent crawl

`dieu-khien/server.js` already calls `net.setDefaultAutoSelectFamily(false)` and installs
`uncaughtException`/`unhandledRejection` handlers — this works around a real Node 20.11.x
core bug (`ERR_INTERNAL_ASSERTION` in `internalConnectMultiple`, Happy-Eyeballs dual-stack
connect) that reproduces reliably when several crawl/import workers open concurrent HTTP
connections. If a future `node_modules`/Node upgrade removes the need for this, it's safe to
leave in place — no need to re-diagnose this if it shows up again in logs.
