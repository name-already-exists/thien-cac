# khotruyenchu-crawler

Crawler thu thập truyện từ [khotruyenchu.fun](https://khotruyenchu.fun).

## Cài đặt

```bash
cd thien-dao/0-crawlers/khotruyenchu-crawler
npm install
```

## Cách dùng

```bash
node index.js <url-truyện> [--from N] [--to N] [--chapter N]
```

### Options

| Option | Mô tả |
|--------|-------|
| `--from N` | Tải từ chương N |
| `--to N` | Tải đến chương N (bao gồm) |
| `--chapter N` | Chỉ tải đúng chương N |
| *(không có option)* | Tải toàn bộ truyện |

### Ví dụ

```bash
# Tải toàn bộ
node index.js https://khotruyenchu.fun/truyen/tien-nghich/

# Tải chương 1 đến 100
node index.js https://khotruyenchu.fun/truyen/tien-nghich/ --from 1 --to 100

# Tiếp tục từ chương 101
node index.js https://khotruyenchu.fun/truyen/tien-nghich/ --from 101 --to 200

# Tải đúng 1 chương
node index.js https://khotruyenchu.fun/truyen/tien-nghich/ --chapter 50

# Truyện khác
node index.js https://khotruyenchu.fun/truyen/pham-nhan-tu-tien/ --from 1 --to 50
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
  "story_source": "https://khotruyenchu.fun/truyen/tien-nghich/",
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

- **Cache**: File `.cache.json` lưu toàn bộ URL chương sau lần khám phá đầu. Các lần chạy sau dùng lại cache, không cần tải lại danh sách.
- **Skip**: Chương đã tải sẽ bị bỏ qua, có thể chạy lại an toàn.
- **Delay**: 1.2 giây giữa mỗi request để tránh bị block.
- **Encoding**: File lưu UTF-8, đọc bằng editor hỗ trợ UTF-8.
- **URL truyện**: Phải dùng dạng `https://khotruyenchu.fun/truyen/<slug>/`, không phải URL homepage.
