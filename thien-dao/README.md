# thien-dao — Crawlers

Các crawler thu thập nội dung truyện từ nhiều nguồn khác nhau.

## Crawlers

| Crawler | Nguồn | Hướng dẫn |
|---------|-------|-----------|
| metruyenchuvn-crawler | metruyenchuvn.com | [README](crawlers/metruyenchuvn-crawler/README.md) |
| khotruyenchu-crawler | khotruyenchu.fun | [README](crawlers/khotruyenchu-crawler/README.md) |

## Cấu trúc output chung

Tất cả crawler đều lưu dữ liệu tại `thien-dao/<slug-truyện>/` với cùng định dạng:

```
thien-dao/
└── <slug-truyen>/
    ├── 0_gioi_thieu.txt      ← thông tin truyện (JSON)
    ├── 1_chuong_1.txt        ← nội dung chương (JSON)
    ├── 2_chuong_2.txt
    ├── ...
    └── .cache.json           ← cache URL chương (ẩn)
```
