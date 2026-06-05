-- =============================================================
-- Thiên Các · Database Schema  v1
-- Ưu tiên: trang chủ, danh sách truyện, đọc chương
-- =============================================================

-- ------------------------------------------------------------
-- Lookup tables
-- ------------------------------------------------------------

CREATE TABLE genres (
  id   bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text UNIQUE NOT NULL,  -- "Tiên hiệp"
  slug text UNIQUE NOT NULL   -- "tien-hiep"
);

CREATE TABLE tags (
  id   bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text UNIQUE NOT NULL,  -- "Tu tiên"
  slug text UNIQUE NOT NULL   -- "tu-tien"
);

-- ------------------------------------------------------------
-- Authors & Translators
-- ------------------------------------------------------------

CREATE TABLE authors (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  bio        text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE translators (
  id         bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name       text NOT NULL,       -- "Nhóm dịch Tu Tiên" hoặc cá nhân
  slug       text UNIQUE NOT NULL,
  bio        text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- Stories (truyện)
-- ------------------------------------------------------------

CREATE TABLE stories (
  id               bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  slug             text UNIQUE NOT NULL,   -- "phamnhan" — dùng cho URL

  -- Tiêu đề
  title            text NOT NULL,          -- "Phàm Nhân Tu Tiên Truyện"
  han              text NOT NULL,          -- "凡人修仙傳"
  han_short        text,                   -- "凡人"
  han1             text,                   -- "凡"  (ký tự trên bìa)
  han2             text,                   -- "人"  (ký tự dưới bìa)

  -- Quan hệ
  author_id        bigint REFERENCES authors(id),
  translator_id    bigint REFERENCES translators(id),
  genre_id         bigint REFERENCES genres(id),

  -- Trạng thái
  status           text NOT NULL DEFAULT 'ongoing'
                   CHECK (status IN ('ongoing', 'completed', 'hiatus', 'dropped')),

  -- Thống kê (cập nhật bằng trigger / scheduled job)
  chapter_count    integer      NOT NULL DEFAULT 0,
  word_count       bigint                DEFAULT 0,   -- tổng số chữ
  reader_count     bigint       NOT NULL DEFAULT 0,
  review_count     integer      NOT NULL DEFAULT 0,
  rating           numeric(3,2) NOT NULL DEFAULT 0
                   CHECK (rating >= 0 AND rating <= 5),

  -- Bảng xếp hạng (reset định kỳ)
  weekly_views     integer NOT NULL DEFAULT 0,
  monthly_views    integer NOT NULL DEFAULT 0,

  -- Hiển thị bìa
  palette          text[] NOT NULL DEFAULT '{}',  -- ["#2E1A18", "#561420"]
  seal_color       text,
  cover_url        text,

  -- Trang chủ — khu vực "Biên tập đề cử"
  is_featured      boolean  NOT NULL DEFAULT false,
  featured_order   smallint,          -- 0 = vị trí chính, 1-4 = side panel
  featured_quote   text,              -- lời bình biên tập ngắn
  featured_week    smallint,          -- tuần trong năm (ISO week)
  featured_year    smallint,

  -- Trang chủ — khu vực "Vừa cập nhật" (denorm để tránh JOIN chậm)
  last_chapter_at     timestamptz,
  last_chapter_number integer,

  description      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Quan hệ nhiều-nhiều: truyện — thẻ
CREATE TABLE story_tags (
  story_id bigint NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  tag_id   bigint NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
  PRIMARY KEY (story_id, tag_id)
);

-- ------------------------------------------------------------
-- Chapters (chương)
-- Tách content sang bảng riêng để list chương load nhanh
-- ------------------------------------------------------------

CREATE TABLE chapters (
  id             bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  story_id       bigint  NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  chapter_number integer NOT NULL,
  title          text    NOT NULL,
  word_count     integer          DEFAULT 0,
  is_published   boolean NOT NULL DEFAULT true,
  published_at   timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, chapter_number)
);

-- Nội dung chương — chỉ load khi người dùng mở đọc
-- Format: plain text. Đoạn văn ngăn cách bằng "\n\n". Thụt lề đầu dòng
-- dùng CSS (text-indent), KHÔNG dùng ký tự space/tab trong content.
CREATE TABLE chapter_contents (
  chapter_id bigint PRIMARY KEY REFERENCES chapters(id) ON DELETE CASCADE,
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- User data (cần auth.users của Supabase)
-- user_id giữ nguyên uuid vì tham chiếu auth.users(id) của Supabase
-- ------------------------------------------------------------

-- Tiến độ đọc: lưu chương đọc cuối cùng của mỗi truyện
CREATE TABLE reading_progress (
  user_id             uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id            bigint NOT NULL REFERENCES stories(id)    ON DELETE CASCADE,
  last_chapter_id     bigint          REFERENCES chapters(id)   ON DELETE SET NULL,
  last_chapter_number integer NOT NULL DEFAULT 1,
  last_read_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, story_id)
);

-- Tủ sách: truyện người dùng đánh dấu theo dõi
CREATE TABLE bookmarks (
  user_id       uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id      bigint NOT NULL REFERENCES stories(id)    ON DELETE CASCADE,
  bookmarked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, story_id)
);

-- ------------------------------------------------------------
-- Indexes — phục vụ các query phổ biến
-- ------------------------------------------------------------

-- Trang chủ: đề cử biên tập
CREATE INDEX idx_stories_featured
  ON stories (featured_order, featured_week, featured_year)
  WHERE is_featured = true;

-- Trang chủ: vừa cập nhật
CREATE INDEX idx_stories_last_chapter_at ON stories (last_chapter_at DESC NULLS LAST);

-- Bảng xếp hạng
CREATE INDEX idx_stories_weekly_views  ON stories (weekly_views  DESC);
CREATE INDEX idx_stories_monthly_views ON stories (monthly_views DESC);

-- Lọc theo thể loại + trạng thái (trang danh sách)
CREATE INDEX idx_stories_genre_status ON stories (genre_id, status);

-- Truyện mới ra (Mới ra tab)
CREATE INDEX idx_stories_created_at ON stories (created_at DESC);

-- Truyện hoàn thành (Hoàn tất tab)
CREATE INDEX idx_stories_completed
  ON stories (chapter_count DESC)
  WHERE status = 'completed';

-- Tra cứu chương theo truyện (danh sách + đọc)
CREATE INDEX idx_chapters_story_num
  ON chapters (story_id, chapter_number)
  WHERE is_published = true;

-- Chương mới nhất (trang chủ: vừa cập nhật)
CREATE INDEX idx_chapters_published_at ON chapters (published_at DESC) WHERE is_published = true;

-- Tiến độ đọc của user
CREATE INDEX idx_reading_progress_user ON reading_progress (user_id, last_read_at DESC);

-- Tủ sách của user
CREATE INDEX idx_bookmarks_user ON bookmarks (user_id, bookmarked_at DESC);

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

ALTER TABLE stories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks        ENABLE ROW LEVEL SECURITY;

-- Nội dung công khai: mọi người đều đọc được
CREATE POLICY "public_read_stories"
  ON stories FOR SELECT USING (true);

CREATE POLICY "public_read_chapters"
  ON chapters FOR SELECT USING (is_published = true);

CREATE POLICY "public_read_chapter_contents"
  ON chapter_contents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chapters c
      WHERE c.id = chapter_id AND c.is_published = true
    )
  );

-- Tiến độ đọc + tủ sách: chỉ owner mới xem/sửa
CREATE POLICY "owner_reading_progress"
  ON reading_progress FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owner_bookmarks"
  ON bookmarks FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Trigger: auto-update stories khi có chương mới
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION fn_update_story_on_chapter()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE stories
  SET
    chapter_count       = (
      SELECT COUNT(*) FROM chapters
      WHERE story_id = NEW.story_id AND is_published = true
    ),
    last_chapter_at     = NEW.published_at,
    last_chapter_number = NEW.chapter_number,
    updated_at          = now()
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_chapter_inserted
AFTER INSERT ON chapters
FOR EACH ROW EXECUTE FUNCTION fn_update_story_on_chapter();

-- ------------------------------------------------------------
-- Seed data: thể loại & thẻ phổ biến
-- ------------------------------------------------------------

INSERT INTO genres (name, slug) VALUES
  ('Tiên hiệp',   'tien-hiep'),
  ('Huyền huyễn', 'huyen-huyen'),
  ('Kiếm hiệp',   'kiem-hiep'),
  ('Ngôn tình',   'ngon-tinh'),
  ('Đô thị',      'do-thi'),
  ('Hệ thống',    'he-thong');

INSERT INTO tags (name, slug) VALUES
  ('Tu tiên',    'tu-tien'),
  ('Trùng sinh', 'trung-sinh'),
  ('Xuyên không','xuyen-khong'),
  ('Hệ thống',   'he-thong'),
  ('Main bá',    'main-ba'),
  ('Kiếm tu',    'kiem-tu'),
  ('Đan dược',   'dan-duoc'),
  ('Kiếm khách', 'kiem-khach'),
  ('Ma đạo',     'ma-dao'),
  ('Yêu thú',    'yeu-thu'),
  ('Văn nhân',   'van-nhan'),
  ('Hài hước',   'hai-huoc'),
  ('Cổ phong',   'co-phong'),
  ('Bi tráng',   'bi-trang'),
  ('Khoa huyễn', 'khoa-huyen'),
  ('Phá án',     'pha-an');
