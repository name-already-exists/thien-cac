Start the dieu-khien local web dashboard (crawl + import control panel) and confirm it's serving.

Usage: /dieu-khien
Example: /dieu-khien

## Steps

**Step 1 — Check if already running**

```bash
curl -s -o /dev/null -w "%{http_code}\n" --max-time 3 http://localhost:4000/
```

If this returns `200`, the app is already running — just report the URL and stop, don't start a second instance (it would fail with `EADDRINUSE`).

**Step 2 — Start**

```bash
cd dieu-khien
node server.js > /tmp/dieu-khien-server.log 2>&1 &
```

Run in background (`run_in_background: true`).

**Step 3 — Wait until it's actually serving**

```bash
timeout 30 bash -c 'until curl -sf http://localhost:4000/ >/dev/null; do sleep 1; done'
```

If this times out, read `/tmp/dieu-khien-server.log` for the startup error (most likely: missing `dieu-khien/node_modules` → run `npm install` in `dieu-khien/` first and retry; or port 4000 already used by something else → retry with `PORT=<other> node server.js`).

**Step 4 — Report**

Tell the user the app is running at **http://localhost:4000** and that it stays up in the background until stopped (`Ctrl+C` if run in foreground, or see `.claude/skills/run-dieu-khien/SKILL.md` for how to stop it from here — Windows Git Bash has no `pkill`, use PowerShell `Get-CimInstance`/`Stop-Process`).
