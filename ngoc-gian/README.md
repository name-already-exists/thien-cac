# ngoc-gian

Import truyện đã crawl từ `thien-dao/` vào Supabase.

## Cài đặt

```bash
cd ngoc-gian
npm install
```

## Cách dùng

```bash
node index.js <story-slug> [options]
```

Import chia làm 2 bước riêng biệt:

**Bước 1 — Upsert metadata truyện:**
```bash
node index.js <story-slug> --story-only
```

**Bước 2 — Import chương:**
```bash
node index.js <story-slug> [options]
```

### Options

| Option | Bước | Mô tả |
|--------|------|-------|
| `--story-only` | 1 | Chỉ upsert tác giả, thể loại, truyện — không import chương |
| `--from N` | 2 | Import từ chương N trở đi |
| `--to N` | 2 | Import đến chương N (bao gồm) |
| `--chapter N` | 2 | Chỉ import đúng chương N |
| `--env path` | cả 2 | Đường dẫn file .env (mặc định: `../.env.local`) |
| `--dry` | cả 2 | Chỉ đọc file, không ghi vào DB |
| `--remove` | — | Xóa truyện (và toàn bộ chương + nội dung) khỏi Supabase |
| `--yes` | — | Bỏ qua xác nhận khi dùng `--remove` |

### Ví dụ

```bash
# Bước 1: upsert metadata (chạy 1 lần)
node index.js tien-nghich --story-only

# Bước 2: import song song 4 khoảng (mỗi terminal 1 lệnh)
node index.js tien-nghich --from 1    --to 494
node index.js tien-nghich --from 495  --to 988
node index.js tien-nghich --from 989  --to 1482
node index.js tien-nghich --from 1483 --to 1976

# Bước 2: import đúng 1 chương
node index.js tien-nghich --chapter 50

# Thử trước (không ghi DB)
node index.js tien-nghich --dry

# Xóa truyện khỏi Supabase (có hỏi xác nhận)
node index.js tien-nghich --remove

# Xóa truyện, bỏ qua xác nhận
node index.js tien-nghich --remove --yes
```

## Biến môi trường

Đọc tự động từ `../.env.local`. Cần có:

```
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...        # ưu tiên (bypass RLS)
# hoặc
NEXT_PUBLIC_SUPABASE_ANON_KEY=...    # nếu không có service role key
```

## Cấu trúc dữ liệu nguồn

Đọc từ `thien-dao/<slug>/`:

```
thien-dao/
└── tien-nghich/
    ├── 0_gioi_thieu.txt      ← thông tin truyện
    ├── 1_chuong_1.txt
    ├── 2_chuong_2.txt
    └── ...
```

## Ánh xạ dữ liệu

| File nguồn | Bảng Supabase |
|-----------|---------------|
| `story_name` | `stories.title` |
| `author` | `authors.name` → `stories.author_id` |
| `genre` | `genres.name` → `stories.genre_id` |
| `story_status` | `stories.status` (`Full` → `completed`, còn lại → `ongoing`) |
| `total_num_chapters` | `stories.chapter_count` |
| `chapter_number` | `chapters.chapter_number` |
| `chapter_name` | `chapters.title` (chữ cái đầu viết hoa) |
| `chapter_content` | `chapter_contents.content` |

## Ghi chú

- **`--story-only`**: Upsert tác giả, thể loại, truyện rồi thoát ngay — dùng làm bước 1 trước khi chạy song song nhiều instance import chương.
- **Upsert**: Chương đã có sẽ được cập nhật, không tạo trùng.
- **Story mới**: Các field UI (`han`, `palette`, v.v.) được đặt giá trị mặc định; có thể chỉnh sau trong Supabase.
- **Story đã có**: Chỉ cập nhật các field từ crawler, không ghi đè field UI đã chỉnh.
- **`--remove`**: Xóa vĩnh viễn truyện + chương + nội dung chương khỏi Supabase (theo `slug`). KHÔNG xóa file local trong `thien-dao/<slug>/`. Mặc định hỏi xác nhận (gõ `yes`), dùng `--yes` để bỏ qua.
