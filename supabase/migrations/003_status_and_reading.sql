-- =============================================================
-- Migration 003 — đổi status 'hiatus' → 'paused'
-- Lý do: frontend dùng 'paused', DB schema cũ dùng 'hiatus'
-- =============================================================

-- Đổi giá trị data trước khi đổi constraint
UPDATE stories SET status = 'paused' WHERE status = 'hiatus';

-- Bỏ constraint cũ, thêm constraint mới
ALTER TABLE stories DROP CONSTRAINT stories_status_check;
ALTER TABLE stories
  ADD CONSTRAINT stories_status_check
  CHECK (status IN ('ongoing', 'completed', 'paused', 'dropped'));

-- Index hỗ trợ filter theo status (Phân loại)
CREATE INDEX IF NOT EXISTS idx_stories_status ON stories (status);
