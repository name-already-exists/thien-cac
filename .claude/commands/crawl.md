Crawl a story from metruyenchuvn.com, truyenyy.co, or khotruyenchu.fun in 2 steps: discover then 4 parallel instances.

Usage: /crawl <story-url>
Example: /crawl https://metruyenchuvn.com/tien-nghich
Example: /crawl https://truyenyy.co/truyen/kiem-lai
Example: /crawl https://khotruyenchu.fun/truyen/tien-nghich/

## Detect crawler

- URL contains `metruyenchuvn.com` → use `thien-dao/crawlers/metruyenchuvn-crawler`
- URL contains `truyenyy.co` → use `thien-dao/crawlers/truyenyy-crawler`
- URL contains `khotruyenchu.fun` → use `thien-dao/crawlers/khotruyenchu-crawler`

## Steps

**Step 1 — Discover**

Run the discover step synchronously (wait for it to finish):

```
cd thien-dao/crawlers/<crawler-dir>
node index.js <story-url> --discover
```

**Step 2 — Read total chapters from cache**

After discover completes, read the cache file to get the total chapter count:
- Cache path: `thien-dao/storage/<slug>/.cache.json`
- The slug is the last path segment of the URL (e.g. `tien-nghich` from `https://metruyenchuvn.com/tien-nghich`, or `kiem-lai` from `https://truyenyy.co/truyen/kiem-lai`)
- Use PowerShell: `(Get-Content "thien-dao/storage/<slug>/.cache.json" | ConvertFrom-Json).PSObject.Properties.Name.Count`

**Step 3 — Split into 4 ranges and run in parallel**

Divide `1..total` into 4 equal ranges (round down for ranges 1-3, last range gets the remainder).
Then launch 4 background Bash commands simultaneously:

```
cd thien-dao/crawlers/<crawler-dir> && node index.js <story-url> --from <start1> --to <end1>
cd thien-dao/crawlers/<crawler-dir> && node index.js <story-url> --from <start2> --to <end2>
cd thien-dao/crawlers/<crawler-dir> && node index.js <story-url> --from <start3> --to <end3>
cd thien-dao/crawlers/<crawler-dir> && node index.js <story-url> --from <start4> --to <end4>
```

Use `run_in_background: true` for all 4 instances. Set timeout to 600000ms each.

**Step 4 — Monitor and report**

Wait for all 4 background tasks to complete. When each one finishes, read the last ~20 lines of its output file and report the summary line (`Hoàn thành: X tải mới | Y bỏ qua | Z thất bại`).

After all 4 complete, print a final table showing results for each instance.
