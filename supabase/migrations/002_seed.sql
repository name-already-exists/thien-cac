-- ================================================================
-- Thiên Các · Seed Data v1
-- Mock data khớp với trang chủ (lib/data.ts)
-- ================================================================

-- ----------------------------------------------------------------
-- Authors
-- ----------------------------------------------------------------
INSERT INTO authors (name, slug) VALUES
  ('Vong Ngữ',              'vong-ngu'),
  ('Phong Hoả Hí Chư Hầu',  'phong-hoa-hi-chu-hau'),
  ('Thần Đông',              'than-dong'),
  ('Tuyết Mãn Lương',        'tuyet-man-luong'),
  ('Ngoạ Ngưu Chân Nhân',    'ngoa-nguu-chan-nhan'),
  ('Mại Báo Tiểu Lang Quân', 'mai-bao-tieu-lang-quan');

-- ----------------------------------------------------------------
-- Translators
-- ----------------------------------------------------------------
INSERT INTO translators (name, slug) VALUES
  ('Nhóm dịch Tu Tiên', 'nhom-dich-tu-tien'),
  ('Thiên Các',          'thien-cac'),
  ('Vong Niệm',          'vong-niem'),
  ('Nhất Mộng',          'nhat-mong'),
  ('Hắc Phong',          'hac-phong');

-- ----------------------------------------------------------------
-- Stories
-- featured_order 0 = ô chính, 1-4 = side panel (home.tsx FeaturedGrid)
-- weekly_views / monthly_views → thứ hạng RankingSidebar
-- created_at stagger → thứ tự tab "Mới ra"
-- chapter_count, word_count, reader_count = số thực của tác phẩm gốc
--   (trigger ghi đè chapter_count khi insert chương, ta restore ở cuối)
-- ----------------------------------------------------------------
INSERT INTO stories (
  slug, title, han, han_short, han1, han2,
  author_id, translator_id, genre_id,
  status, chapter_count, word_count, reader_count, review_count, rating,
  palette, seal_color, description,
  is_featured, featured_order, featured_quote, featured_week, featured_year,
  weekly_views, monthly_views, created_at
) VALUES

-- ô chính
(
  'phamnhan', 'Phàm Nhân Tu Tiên Truyện', '凡人修仙傳', '凡人', '凡', '人',
  (SELECT id FROM authors     WHERE slug = 'vong-ngu'),
  (SELECT id FROM translators WHERE slug = 'nhom-dich-tu-tien'),
  (SELECT id FROM genres      WHERE slug = 'tien-hiep'),
  'completed', 2448, 9400000, 5200000, 12400, 4.9,
  ARRAY['#2E1A18','#561420'], '#8B2331',
  'Một câu chuyện về Hàn Lập — thiếu niên xuất thân tầm thường ở thôn quê hẻo lánh, bằng sự cẩn trọng cùng kiên nhẫn, từng bước bước lên đỉnh tu tiên giới. Không tài năng đặc biệt, không bối cảnh hiển hách, chỉ có một quả tim không cam chịu và đôi bàn tay biết chờ thời. Phàm nhân làm sao trường sinh? Tự mình đi tìm câu trả lời.',
  true, 0, null, 21, 2026,
  520000, 1800000, '2018-06-05 00:00:00+00'
),

-- side 1
(
  'kiemlai', 'Kiếm Lai', '劍來', '劍來', '劍', '來',
  (SELECT id FROM authors     WHERE slug = 'phong-hoa-hi-chu-hau'),
  (SELECT id FROM translators WHERE slug = 'thien-cac'),
  (SELECT id FROM genres      WHERE slug = 'tien-hiep'),
  'ongoing', 1247, 6800000, 3100000, 8200, 4.8,
  ARRAY['#1F2D1F','#2E5447'], '#8B2331',
  'Trần Bình An — một cậu bé mồ côi của thôn nhỏ Lệ Châu, sống nhờ nghề đốt than. Hắn không có tư chất luyện kiếm, nhưng tâm hồn lại trong trẻo như nước suối đầu nguồn. Một ngày nọ, vận mệnh khiến hắn nhặt được lưỡi kiếm gãy của một vị tiên nhân đã sa cơ.',
  true, 1, '"Văn phong tuyệt mỹ — phải đọc."', 21, 2026,
  490000, 1600000, '2022-06-05 00:00:00+00'
),

-- side 2
(
  'giathien', 'Già Thiên', '遮天', '遮天', '遮', '天',
  (SELECT id FROM authors     WHERE slug = 'than-dong'),
  (SELECT id FROM translators WHERE slug = 'vong-niem'),
  (SELECT id FROM genres      WHERE slug = 'huyen-huyen'),
  'completed', 1817, 8100000, 4600000, 9800, 4.7,
  ARRAY['#3D2530','#2D1B1F'], '#8B2331',
  'Mặt trời rồi cũng sẽ tắt, sao trời rồi cũng sẽ tàn. Khi vạn vật quy về tịch diệt, ai có thể nắm giữ một tia sống cuối cùng? Diệp Phàm cùng chín người bạn cấp ba bước vào chuyến tàu vũ trụ định mệnh — đi tìm câu trả lời ở tận cùng tinh không.',
  true, 2, '"Cốt truyện sâu, chậm rãi mà cuốn."', 21, 2026,
  460000, 1900000, '2020-06-05 00:00:00+00'
),

-- side 3
(
  'tieudao', 'Tiêu Dao Tiểu Thư Sinh', '逍遙小書生', '逍遙', '逍', '遙',
  (SELECT id FROM authors     WHERE slug = 'tuyet-man-luong'),
  (SELECT id FROM translators WHERE slug = 'nhat-mong'),
  (SELECT id FROM genres      WHERE slug = 'kiem-hiep'),
  'ongoing', 524, 2200000, 892000, 3100, 4.6,
  ARRAY['#2A3A48','#3A5266'], '#8B2331',
  'Một tiểu thư sinh xuyên không thành chàng thư sinh nghèo, không võ công không công danh, chỉ có một bụng thơ phú và miệng lưỡi sắc bén. Vận mệnh đưa hắn vào triều đình, vào giang hồ, vào cả lòng người.',
  true, 3, '"Tác phẩm hiếm có của năm."', 21, 2026,
  400000, 1400000, '2025-06-05 00:00:00+00'
),

-- side 4
(
  'tuchantuvannien', 'Tu Chân Tứ Vạn Niên', '修真四萬年', '修真', '修', '真',
  (SELECT id FROM authors     WHERE slug = 'ngoa-nguu-chan-nhan'),
  (SELECT id FROM translators WHERE slug = 'thien-cac'),
  (SELECT id FROM genres      WHERE slug = 'huyen-huyen'),
  'completed', 1602, 7300000, 2400000, 5600, 4.8,
  ARRAY['#1A2942','#0F1B2D'], '#8B2331',
  'Bốn vạn năm trước, tu chân giới phồn thịnh đỉnh cao. Bốn vạn năm sau, chỉ còn lại ngọn lửa tàn. Lý Diệu Nhất từ thời cổ tu chân giới trở lại, đối mặt với một thế giới đã hoàn toàn đổi khác.',
  true, 4, '"Hệ thống tu luyện độc đáo."', 21, 2026,
  380000, 1200000, '2023-06-05 00:00:00+00'
),

-- không featured, chỉ xuất hiện trong ranking
(
  'dautrieu', 'Đại Phụng Đả Canh Nhân', '大奉打更人', '大奉', '大', '奉',
  (SELECT id FROM authors     WHERE slug = 'mai-bao-tieu-lang-quan'),
  (SELECT id FROM translators WHERE slug = 'hac-phong'),
  (SELECT id FROM genres      WHERE slug = 'huyen-huyen'),
  'ongoing', 982, 5100000, 3800000, 11200, 4.9,
  ARRAY['#2B2018','#3D2A1B'], '#8B2331',
  'Hứa Thất An — một thanh tra cảnh sát hiện đại tỉnh dậy trong cơ thể một tên tù khốn khổ của Đại Phụng vương triều. Từ ngục tối bước ra, hắn dùng tư duy phá án hiện đại để tung hoành giang hồ phong ba dày đặc.',
  false, null, null, null, null,
  350000, 1700000, '2024-06-05 00:00:00+00'
);

-- ----------------------------------------------------------------
-- Story Tags
-- ----------------------------------------------------------------
INSERT INTO story_tags (story_id, tag_id)
SELECT s.id, t.id FROM stories s, tags t
WHERE s.slug = 'phamnhan' AND t.name IN ('Tu tiên', 'Trùng sinh', 'Main bá', 'Hệ thống');

INSERT INTO story_tags (story_id, tag_id)
SELECT s.id, t.id FROM stories s, tags t
WHERE s.slug = 'kiemlai' AND t.name IN ('Kiếm tu', 'Văn nhân');

INSERT INTO story_tags (story_id, tag_id)
SELECT s.id, t.id FROM stories s, tags t
WHERE s.slug = 'giathien' AND t.name IN ('Cổ phong', 'Bi tráng');

INSERT INTO story_tags (story_id, tag_id)
SELECT s.id, t.id FROM stories s, tags t
WHERE s.slug = 'tieudao' AND t.name IN ('Văn nhân', 'Hài hước');

INSERT INTO story_tags (story_id, tag_id)
SELECT s.id, t.id FROM stories s, tags t
WHERE s.slug = 'tuchantuvannien' AND t.name IN ('Khoa huyễn', 'Hệ thống');

INSERT INTO story_tags (story_id, tag_id)
SELECT s.id, t.id FROM stories s, tags t
WHERE s.slug = 'dautrieu' AND t.name = 'Phá án';

-- ----------------------------------------------------------------
-- Chapters — 5 chương mỗi truyện, đủ để trigger set last_chapter_at
-- ch5.published_at là mốc mới nhất → trigger ghi vào last_chapter_at
-- Thứ tự last chapter: phamnhan > kiemlai > dautrieu > giathien > tieudao > tuchantuvannien
-- ----------------------------------------------------------------

INSERT INTO chapters (story_id, chapter_number, title, word_count, published_at)
SELECT (SELECT id FROM stories WHERE slug = 'phamnhan'), num, title, wc, CAST(pub AS timestamptz)
FROM (VALUES
  (1, 'Sơn thôn thiếu niên',         420, '2026-05-24 22:00:00+00'),
  (2, 'Thất tinh hồng truyền công',  440, '2026-05-27 22:00:00+00'),
  (3, 'Lục lâm phiên thế',           460, '2026-05-30 22:00:00+00'),
  (4, 'Sơ luyện đan dược',           480, '2026-06-02 22:00:00+00'),
  (5, 'Tâm cảnh đan thuốc',          500, '2026-06-05 22:00:00+00')
) AS t(num, title, wc, pub);

INSERT INTO chapters (story_id, chapter_number, title, word_count, published_at)
SELECT (SELECT id FROM stories WHERE slug = 'kiemlai'), num, title, wc, CAST(pub AS timestamptz)
FROM (VALUES
  (1, 'Sơn thôn thiếu niên',         420, '2026-05-24 18:00:00+00'),
  (2, 'Thất tinh hồng truyền công',  440, '2026-05-27 18:00:00+00'),
  (3, 'Lục lâm phiên thế',           460, '2026-05-30 18:00:00+00'),
  (4, 'Sơ luyện đan dược',           480, '2026-06-02 18:00:00+00'),
  (5, 'Tâm cảnh đan thuốc',          500, '2026-06-05 18:00:00+00')
) AS t(num, title, wc, pub);

INSERT INTO chapters (story_id, chapter_number, title, word_count, published_at)
SELECT (SELECT id FROM stories WHERE slug = 'dautrieu'), num, title, wc, CAST(pub AS timestamptz)
FROM (VALUES
  (1, 'Sơn thôn thiếu niên',         420, '2026-05-24 06:00:00+00'),
  (2, 'Thất tinh hồng truyền công',  440, '2026-05-27 06:00:00+00'),
  (3, 'Lục lâm phiên thế',           460, '2026-05-30 06:00:00+00'),
  (4, 'Sơ luyện đan dược',           480, '2026-06-02 06:00:00+00'),
  (5, 'Tâm cảnh đan thuốc',          500, '2026-06-05 06:00:00+00')
) AS t(num, title, wc, pub);

INSERT INTO chapters (story_id, chapter_number, title, word_count, published_at)
SELECT (SELECT id FROM stories WHERE slug = 'giathien'), num, title, wc, CAST(pub AS timestamptz)
FROM (VALUES
  (1, 'Sơn thôn thiếu niên',         420, '2026-05-23 00:00:00+00'),
  (2, 'Thất tinh hồng truyền công',  440, '2026-05-26 00:00:00+00'),
  (3, 'Lục lâm phiên thế',           460, '2026-05-29 00:00:00+00'),
  (4, 'Sơ luyện đan dược',           480, '2026-06-01 00:00:00+00'),
  (5, 'Tâm cảnh đan thuốc',          500, '2026-06-04 00:00:00+00')
) AS t(num, title, wc, pub);

INSERT INTO chapters (story_id, chapter_number, title, word_count, published_at)
SELECT (SELECT id FROM stories WHERE slug = 'tieudao'), num, title, wc, CAST(pub AS timestamptz)
FROM (VALUES
  (1, 'Sơn thôn thiếu niên',         420, '2026-05-21 00:00:00+00'),
  (2, 'Thất tinh hồng truyền công',  440, '2026-05-24 00:00:00+00'),
  (3, 'Lục lâm phiên thế',           460, '2026-05-27 00:00:00+00'),
  (4, 'Sơ luyện đan dược',           480, '2026-05-30 00:00:00+00'),
  (5, 'Tâm cảnh đan thuốc',          500, '2026-06-02 00:00:00+00')
) AS t(num, title, wc, pub);

INSERT INTO chapters (story_id, chapter_number, title, word_count, published_at)
SELECT (SELECT id FROM stories WHERE slug = 'tuchantuvannien'), num, title, wc, CAST(pub AS timestamptz)
FROM (VALUES
  (1, 'Sơn thôn thiếu niên',         420, '2026-05-19 00:00:00+00'),
  (2, 'Thất tinh hồng truyền công',  440, '2026-05-22 00:00:00+00'),
  (3, 'Lục lâm phiên thế',           460, '2026-05-25 00:00:00+00'),
  (4, 'Sơ luyện đan dược',           480, '2026-05-28 00:00:00+00'),
  (5, 'Tâm cảnh đan thuốc',          500, '2026-05-31 00:00:00+00')
) AS t(num, title, wc, pub);

-- Restore chapter_count thực tế (trigger ghi đè thành 5 khi seed)
UPDATE stories SET chapter_count = 2448 WHERE slug = 'phamnhan';
UPDATE stories SET chapter_count = 1247 WHERE slug = 'kiemlai';
UPDATE stories SET chapter_count = 1817 WHERE slug = 'giathien';
UPDATE stories SET chapter_count =  524 WHERE slug = 'tieudao';
UPDATE stories SET chapter_count = 1602 WHERE slug = 'tuchantuvannien';
UPDATE stories SET chapter_count =  982 WHERE slug = 'dautrieu';

-- ----------------------------------------------------------------
-- Chapter content — chỉ chương 1 của Phàm Nhân (demo reader)
-- ----------------------------------------------------------------
INSERT INTO chapter_contents (chapter_id, content)
SELECT c.id,
'Hàn Lập ngẩng đầu nhìn lên bầu trời xanh thẳm, đôi mắt khẽ nheo lại. Đã ba ngày liền, hắn không ngủ. Cơ thể tuy mỏi mệt nhưng tinh thần lại vô cùng minh mẫn — như một dây đàn được kéo căng đến tột độ, chỉ chờ một tiếng vang mà bật ra.

Trong đan điền, một luồng linh khí mỏng manh đang chầm chậm xoay vòng. Đây là lần đầu tiên hắn cảm nhận được nó một cách rõ ràng như vậy. Suốt bao nhiêu năm khổ luyện, từng ngày ngồi tĩnh tâm dưới gốc cổ thụ, từng đêm đối diện ngọn đèn dầu leo lét — cuối cùng cũng có thành quả.

"Trúc cơ kỳ…" hắn thầm thì. Hai chữ ấy đối với người tầm thường mà nói là cả một giấc mơ xa vời, nhưng đối với hắn lại chỉ là khởi đầu. Phía trước còn dài, phía trước là vạn dặm núi sông cần phải đi qua. Là Kim Đan, là Nguyên Anh, là Hóa Thần, là Luyện Hư Hợp Đạo — là trường sinh.

Có tiếng bước chân nhẹ vang lên phía sau. Hàn Lập không cần quay đầu cũng biết là Mặc Đại Phu — vị lão giả đã âm thầm chỉ điểm hắn suốt mấy năm qua. Lão không nói gì, chỉ đặt một bình gốm nhỏ lên phiến đá bên cạnh, rồi lặng lẽ rời đi.

"Sư phụ…" Hàn Lập khẽ gọi, nhưng tiếng ấy bị gió núi cuốn đi mất.

Đêm hôm ấy, hắn ngồi trước phiến đá, nắp bình gốm mở ra, một mùi hương đan dược thơm ngát bốc lên. Hai viên đan dược màu lục đậm nằm im lìm — Trúc Cơ Đan. Vật mà người tu tiên cả đời mơ ước, vậy mà lão sư phụ tặng cho hắn hai viên không một chút do dự.

Hàn Lập đặt một viên lên môi. Đan dược tan ra rất nhanh, một luồng nhiệt khí cuồn cuộn chảy vào kinh mạch, va đập với linh khí trong đan điền. Hắn cắn răng, dồn toàn bộ tâm thần vào việc dẫn dắt — đây là khoảnh khắc quyết định.'
FROM chapters c
WHERE c.story_id = (SELECT id FROM stories WHERE slug = 'phamnhan')
  AND c.chapter_number = 1;

-- ----------------------------------------------------------------
-- NOTE: "Đang đọc dở" dùng bảng reading_progress (cần user đăng nhập).
-- Test thủ công sau khi login:
--   INSERT INTO reading_progress (user_id, story_id, last_chapter_number)
--   VALUES (auth.uid(), (SELECT id FROM stories WHERE slug = 'kiemlai'), 3);
-- ----------------------------------------------------------------
