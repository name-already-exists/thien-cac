-- =============================================================
-- Migration 004 — Thống kê lượt đọc theo ngày
-- Không đụng tới stories.reader_count / weekly_views / monthly_views
-- (các cột đó vẫn là số giả seed sẵn, giữ nguyên riêng biệt)
-- =============================================================

-- Lượt đọc mỗi truyện, gộp theo ngày. Tháng/năm suy ra bằng GROUP BY date_trunc(),
-- không cần bảng riêng — quy mô dự kiến (vài nghìn truyện x 365 ngày/năm) vẫn nhỏ.
CREATE TABLE story_views_daily (
  story_id   bigint NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  view_date  date    NOT NULL DEFAULT CURRENT_DATE,
  view_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (story_id, view_date)
);

-- Quét theo khoảng ngày cho dashboard ("top truyện tuần này", v.v.)
CREATE INDEX idx_story_views_daily_date ON story_views_daily (view_date);

-- RLS: không tạo policy cho anon/authenticated — chặn hoàn toàn SELECT/INSERT/UPDATE
-- trực tiếp từ client. Ghi chỉ qua RPC bên dưới (SECURITY DEFINER, bỏ qua RLS).
-- Đọc để làm dashboard dùng service_role key ở phía admin (server-side).
ALTER TABLE story_views_daily ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION record_story_view(p_story_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO story_views_daily (story_id, view_date, view_count)
  VALUES (p_story_id, CURRENT_DATE, 1)
  ON CONFLICT (story_id, view_date)
  DO UPDATE SET view_count = story_views_daily.view_count + 1;
END;
$$;

GRANT EXECUTE ON FUNCTION record_story_view(bigint) TO anon, authenticated;
