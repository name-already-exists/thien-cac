Import a story from thien-dao/storage into Supabase in 2 steps: upsert story metadata then 4 parallel chapter imports.

Usage: /import <story-slug>
Example: /import tien-nghich

## Steps

**Step 1 — Upsert story metadata**

Run synchronously (wait for it to finish):

```
cd ngoc-gian
node index.js <slug> --story-only
```

This upserts author, genre, and story record into Supabase. Note the Story ID from output.

**Step 2 — Read total chapters from storage**

Count chapter files to determine the range:
- Storage path: `thien-dao/storage/<slug>/`
- Use PowerShell: `(Get-ChildItem "thien-dao/storage/<slug>" -Filter "*_chuong_*.txt").Count`

**Step 3 — Split into 4 ranges and run in parallel**

Divide `1..total` into 4 equal ranges (round down for ranges 1-3, last range gets the remainder).
Then launch 4 background Bash commands simultaneously:

```
cd ngoc-gian && node index.js <slug> --from <start1> --to <end1>
cd ngoc-gian && node index.js <slug> --from <start2> --to <end2>
cd ngoc-gian && node index.js <slug> --from <start3> --to <end3>
cd ngoc-gian && node index.js <slug> --from <start4> --to <end4>
```

Use `run_in_background: true` for all 4 instances. Set timeout to 600000ms each.

**Step 4 — Monitor and report**

Wait for all 4 background tasks to complete. When each one finishes, read the last ~10 lines of its output file and report the summary line (`Hoàn thành: X thành công | Y thất bại`).

After all 4 complete, print a final table showing results for each instance.
