# metruyenchuvn-crawler

Crawler thu thập truyện từ [metruyenchuvn.com](https://metruyenchuvn.com).

## Cài đặt

```bash
cd thien-dao/0-crawlers/metruyenchuvn-crawler
npm install
```

## Cách dùng

Crawler chia làm 2 bước riêng biệt:

**Bước 1 — Lấy cache URL chương:**
```bash
node index.js <url-truyện> --discover
```

**Bước 2 — Tải chương:**
```bash
node index.js <url-truyện> [--from N] [--to N] [--chapter N]
```

### Options

| Option | Bước | Mô tả |
|--------|------|-------|
| `--discover` | 1 | Quét toàn bộ danh sách chương, lưu vào `.cache.json` |
| `--from N` | 2 | Tải từ chương N |
| `--to N` | 2 | Tải đến chương N (bao gồm) |
| `--chapter N` | 2 | Chỉ tải đúng chương N |

### Ví dụ

```bash
# Bước 1: lấy cache (chạy 1 lần, hoặc khi truyện ra chương mới)
node index.js https://metruyenchuvn.com/tien-nghich --discover

# Bước 2: tải toàn bộ
node index.js https://metruyenchuvn.com/tien-nghich

# Bước 2: tải song song 4 khoảng (mỗi terminal 1 lệnh)
node index.js https://metruyenchuvn.com/tien-nghich --from 1    --to 494
node index.js https://metruyenchuvn.com/tien-nghich --from 495  --to 988
node index.js https://metruyenchuvn.com/tien-nghich --from 989  --to 1482
node index.js https://metruyenchuvn.com/tien-nghich --from 1483 --to 1976

# Bước 2: tải đúng 1 chương
node index.js https://metruyenchuvn.com/tien-nghich --chapter 50
```

## Cấu trúc output

Dữ liệu lưu tại `thien-dao/<slug-truyện>/`:

```
thien-dao/
└── tien-nghich/
    ├── 0_gioi_thieu.txt      ← thông tin truyện
    ├── 1_chuong_1.txt
    ├── 2_chuong_2.txt
    ├── ...
    └── .cache.json           ← cache URL chương (ẩn)
```

### `0_gioi_thieu.txt`

```json
{
  "story_name": "Tiên Nghịch",
  "description": "...",
  "author": "Nhĩ Căn",
  "genre": "Tiên Hiệp",
  "total_num_chapters": "1976",
  "story_source": "https://metruyenchuvn.com/tien-nghich",
  "story_status": "Full"
}
```

### `N_chuong_N.txt`

```json
{
  "chapter_number": "Chương 1",
  "chapter_name": "Ly hương",
  "chapter_content": "Thiết Trụ ngồi ở bên con đường nhỏ..."
}
```

## Ghi chú

- **Cache**: File `.cache.json` lưu toàn bộ URL chương sau khi chạy `--discover`. Bước 2 đọc cache trực tiếp, không gọi mạng để discovery. Chạy lại `--discover` sẽ cập nhật thêm chương mới mà không xóa entry cũ.
- **Skip**: Chương đã tải sẽ bị bỏ qua, có thể chạy lại an toàn.
- **Delay**: 1.2 giây giữa mỗi request để tránh bị block.
- **Encoding**: File lưu UTF-8, đọc bằng editor hỗ trợ UTF-8.
