# dieu-khien — Bảng Điều Khiển Crawl & Import

App local có giao diện web, thay thế việc gọi tay 2 slash-command `/crawl` và `/import`:
dán 1 URL truyện → tự nhận diện nguồn (metruyenchuvn.com / truyenyy.co / khotruyenchu.fun) →
tự discover → tự crawl (song song nội bộ) → tự import vào Supabase (song song nội bộ) →
theo dõi tiến độ/log realtime, retry được từng chương lỗi.

Không thay thế các CLI gốc (`thien-dao/crawlers/*`, `ngoc-gian/`) — app này gọi thẳng vào
logic dùng chung (`lib.js`) của các tool đó, các CLI `node index.js ...` vẫn chạy độc lập
như trước, không đổi hành vi.

## Cài đặt

```bash
cd dieu-khien
npm install
```

## Start

```bash
cd dieu-khien
npm start
```

(tương đương `node server.js`). Mặc định chạy tại **http://localhost:4000** — mở URL này
bằng trình duyệt. Đổi cổng bằng biến môi trường `PORT`:

```bash
PORT=5000 npm start
```

Server đọc `.env.local` ở root repo (đường dẫn cấu hình được trong màn **Cấu hình** của UI,
ưu tiên `SUPABASE_SERVICE_ROLE_KEY`) — cần file này tồn tại và có thông tin Supabase đúng thì
Import mới ghi được dữ liệu thật.

## Stop

Server chạy ở foreground: nhấn `Ctrl+C` trong terminal đang chạy `npm start`.

Nếu chạy nền (background) và cần dừng bằng tay, tìm và kill tiến trình `node server.js`:

```powershell
# PowerShell — tìm PID
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -like '*server.js*' } |
  Select-Object ProcessId, CommandLine

# Dừng theo PID tìm được
Stop-Process -Id <PID> -Force
```

```bash
# macOS/Linux
pkill -f "node server.js"
```

## Các màn hình

- **Danh sách truyện** — toàn bộ truyện đã/đang crawl (suy từ `thien-dao/storage/` +
  Supabase), 2 progress bar (crawl/import), nút `Crawl` / `Import` / `Full` / xoá nhanh.
- **Thêm truyện** — dán URL, app tự nhận diện nguồn, bấm bắt đầu là chạy full pipeline
  (Discover ▸ Crawl ▸ Import).
- **Trang chi tiết** — log realtime (SSE), 2 progress bar riêng crawl/import, danh sách
  chương lỗi kèm nút retry từng chương hoặc retry tất cả.
- **Cấu hình** — số luồng song song (1-8, mặc định 4), đường dẫn `.env`, chế độ dry-run
  (chạy pipeline nhưng không ghi Supabase). Lưu vào `dieu-khien/.settings.json`, giữ nguyên
  qua các lần restart.

## Lưu ý

- App không có auth — chỉ chạy trên máy cá nhân (`localhost`), không expose ra ngoài.
- Xoá truyện (nút thùng rác / "Xoá khỏi Supabase") chỉ xoá trong Supabase, **giữ nguyên**
  file local trong `thien-dao/storage/<slug>/`.
- `.settings.json` là file cấu hình local, không commit vào git.
