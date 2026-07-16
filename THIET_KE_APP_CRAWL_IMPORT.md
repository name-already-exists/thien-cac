# Prompt thiết kế: App local (có giao diện) — crawl (thien-dao) + import (ngoc-gian) vào DB truyện

> File này là bản mô tả/yêu cầu để đưa cho Claude thiết kế & build. Chưa code gì trong file này.

## 1. Bối cảnh hiện tại

- **`thien-dao/crawlers/*`** — 3 crawler độc lập (`metruyenchuvn-crawler`, `truyenyy-crawler`, `khotruyenchu-crawler`), mỗi cái chạy qua CLI 2 bước: `--discover` (quét danh sách chương → `thien-dao/storage/<slug>/.cache.json`) rồi tải chương (`--from/--to/--chapter`) → ghi file `thien-dao/storage/<slug>/{0_gioi_thieu,N_chuong_N}.txt`.
- **`ngoc-gian/index.js`** — đọc file trong `thien-dao/storage/<slug>/`, upsert vào Supabase (`--story-only` cho metadata, rồi `--from/--to/--chapter` cho từng chương), đọc `.env.local` ở root.
- **Điều phối hiện tại**: 2 slash-command Claude Code (`.claude/commands/crawl.md`, `.claude/commands/import.md`) — Claude tự đọc cache lấy tổng số chương, chia 4 range, spawn 4 tiến trình nền song song, rồi gộp báo cáo. Tức là **con người/Claude đứng ra điều phối bằng tay mỗi lần**, không có giao diện, không tự động end-to-end.
- **Schema Supabase** liên quan: `stories`, `authors`, `genres`, `chapters`, `chapter_contents` (xem `supabase/migrations/001_initial_schema.sql`). Mapping field đã cố định trong `ngoc-gian/README.md`.

## 2. Mục tiêu

Xây 1 **app JS chạy local, có giao diện (web UI)**, thay thế việc phải gọi tay 2 slash-command:
- Nhập 1 URL truyện → app tự nhận diện nguồn, tự discover, tự crawl (song song nội bộ), tự import vào Supabase (song song nội bộ), tự báo tiến độ/kết quả — không cần Claude Code đứng giữa điều phối từng bước nữa.
- Có màn hình theo dõi trạng thái tất cả truyện đã/đang crawl + import, retry được phần lỗi.

## 3. Kiến trúc đề xuất

- **Backend**: Node.js (Express hoặc Fastify), chạy local (vd `localhost:4000`).
  - Tái sử dụng logic 3 crawler + `ngoc-gian` bằng cách bóc phần lõi (fetch+parse, upsert Supabase) thành **module dùng chung**, giữ nguyên CLI cũ hoạt động song song (không xoá `index.js` hiện tại, không đổi hành vi CLI).
  - Không được đổi format output crawler (`0_gioi_thieu.txt`, `N_chuong_N.txt`, `.cache.json`) — `ngoc-gian` và các phần khác phụ thuộc vào đó.
  - Không đổi mapping field / schema Supabase.
- **Frontend**: 1 trang UI đơn giản (vanilla HTML/JS + fetch, hoặc React nếu thấy cần), phục vụ tại chính backend trên, không cần build phức tạp.
- **Realtime**: SSE hoặc WebSocket để đẩy log + % tiến độ crawl/import lên UI khi đang chạy (thay cho việc đọc file log tay như hiện tại).
- **Song song nội bộ**: thay vì Claude spawn 4 Bash process nền, app tự chia range và chạy song song bằng `Promise.all`/worker nội bộ, cấu hình được số luồng.

## 4. Luồng nghiệp vụ (1 truyện, end-to-end)

1. Dán URL truyện vào UI → backend tự nhận diện nguồn theo domain (`metruyenchuvn.com` / `truyenyy.co` / `khotruyenchu.fun`).
2. **Discover**: quét toàn bộ danh sách chương → biết tổng số chương, lưu cache như hiện tại.
3. **Crawl**: tự chia N range (mặc định 4, cấu hình được), chạy song song nội bộ, progress bar theo số chương tải xong/tổng, tự log chương lỗi.
4. **Import**: bước 1 upsert story-only (author/genre/story), rồi import chương theo range song song nội bộ — tương tự.
5. UI hiển thị trạng thái theo thời gian thực, cho phép resume phần dở dang hoặc retry riêng các chương lỗi (không crawl/import lại toàn bộ).

## 5. UI cần có

- **Danh sách truyện**: slug, nguồn, trạng thái crawl (x/y chương), trạng thái import (x/y chương), nút `Crawl`, `Import`, `Crawl + Import (full)`, `Xoá khỏi Supabase` (có confirm, giữ semantics giống `--remove --yes` hiện tại).
- **Trang chi tiết truyện**: log realtime, 2 progress bar (crawl, import) tách riêng, danh sách chương lỗi kèm nút retry từng chương.
- **Form thêm truyện mới**: dán URL → tự nhận diện nguồn → nút bắt đầu pipeline full.
- **Cấu hình chung**: số luồng song song, đường dẫn `.env`, toggle dry-run (không ghi DB thật).

## 6. API / module boundary đề xuất

| Route | Việc làm |
|---|---|
| `POST /stories` `{url}` | Discover + tạo bản ghi theo dõi tiến trình |
| `POST /stories/:slug/crawl` `{from,to,concurrency}` | Crawl chương theo range |
| `POST /stories/:slug/import` `{from,to,storyOnly}` | Import chương/metadata theo range |
| `GET /stories` | Danh sách truyện + trạng thái (đọc storage + Supabase) |
| `GET /stories/:slug/events` (SSE/WS) | Log + tiến độ realtime |
| `DELETE /stories/:slug` | Xoá khỏi Supabase (giữ file local, giống `--remove`) |

## 7. Ràng buộc bắt buộc giữ nguyên

- Format file `thien-dao/storage/<slug>/...` không đổi.
- Mapping field & schema Supabase không đổi (theo `ngoc-gian/README.md`).
- Đọc biến môi trường từ `.env.local` ở root, ưu tiên `SUPABASE_SERVICE_ROLE_KEY`.
- CLI thuần (`node index.js ...`) của cả 2 tool vẫn phải chạy được như cũ, không breaking change, để dùng cho automation/script không cần UI.

## 8. Ngoài phạm vi

- Không cần deploy production, chỉ chạy local (localhost).
- Không cần auth cho UI (1 user, máy cá nhân).
- Không viết lại parser HTML của 3 crawler — chỉ bóc thành module gọi được, giữ nguyên logic crawl.

## 9. Việc Claude cần làm khi build từ prompt này

1. Đề xuất tên & vị trí thư mục app mới (vd `dieu-khien/` — bảng điều khiển), không lẫn vào `thien-dao/` hay `ngoc-gian/`.
2. Refactor tối thiểu: bóc phần lõi của crawler + `ngoc-gian` thành function export dùng chung được, giữ file CLI cũ gọi lại các function đó (không duplicate logic).
3. Viết backend + API theo mục 6.
4. Viết UI theo mục 5, ưu tiên đơn giản, dùng được ngay.
5. Test full pipeline với ít nhất 1 truyện thật/mỗi nguồn (3 nguồn).
