// Bộ palette tối, 2 màu gradient — cùng style với dữ liệu seed hiện có.
// Mỗi palette gắn từ khóa chủ đề để chọn theo tên truyện + mô tả.
export const PALETTES = [
  { colors: ['#2E1A18', '#561420'], tags: ['huyết', 'máu', 'sát', 'đan dược', 'luyện đan'] },              // nâu đỏ
  { colors: ['#1F2D1F', '#2E5447'], tags: ['mộc', 'rừng', 'thảo dược', 'dược', 'cây', 'lục'] },             // xanh lục tối
  { colors: ['#3D2530', '#2D1B1F'], tags: ['bi tráng', 'tận thế', 'diệt vong', 'hủy diệt', 'tang tóc'] },   // mận tối
  { colors: ['#2A3A48', '#3A5266'], tags: ['thủy', 'băng', 'tuyết', 'hàn', 'lạnh', 'biển', 'sông'] },       // xanh dương tối
  { colors: ['#1A2942', '#0F1B2D'], tags: ['vũ trụ', 'tinh không', 'sao', 'thiên hà', 'tinh tú'] },         // navy tối
  { colors: ['#2B2018', '#3D2A1B'], tags: ['thổ', 'đất', 'sơn thôn', 'thôn', 'nông', 'làng'] },              // nâu tối
  { colors: ['#1a1a2e', '#16213e'], tags: ['huyền', 'huyền huyễn', 'bí ẩn', 'phù chú', 'pháp thuật'] },     // tím navy
  { colors: ['#2D1B2E', '#4A2545'], tags: ['yêu', 'ma', 'tà', 'quỷ', 'yêu quái'] },                          // tím mận
  { colors: ['#1E2B23', '#27403A'], tags: ['cổ', 'hoang', 'rừng già', 'thượng cổ', 'di tích'] },             // xanh rêu
  { colors: ['#3A1F1F', '#5C2A2A'], tags: ['chiến', 'chiến tranh', 'huyết chiến', 'sa trường'] },           // đỏ gạch
  { colors: ['#1B2A3A', '#27465E'], tags: ['hải', 'đảo', 'thủy tộc', 'long cung', 'biển khơi'] },           // xanh biển tối
  { colors: ['#2E2418', '#4A3A1F'], tags: ['kim', 'đồng', 'luyện khí', 'pháp khí', 'kim loại'] },           // nâu đồng
  { colors: ['#241B2E', '#3A2A4A'], tags: ['khói', 'sương', 'huyễn cảnh', 'mộng'] },                        // tím khói
  { colors: ['#1C2E2A', '#2E4A3F'], tags: ['ngọc', 'bảo vật', 'linh khí', 'kỳ trân'] },                     // lục bảo
  { colors: ['#2F1A2A', '#4F2A45'], tags: ['tình', 'duyên', 'hồng nhan', 'ái tình', 'mỹ nhân'] },           // hồng tía tối
  { colors: ['#1A2420', '#2A3D33'], tags: ['sơn dã', 'thú', 'yêu thú', 'rừng sâu'] },                       // rừng sâu
  { colors: ['#33231A', '#523728'], tags: ['kiếm', 'kiếm tu', 'kiếm khí', 'đao'] },                         // gỗ mun
  { colors: ['#1E1F33', '#2E3157'], tags: ['đêm', 'dạ hành', 'ám sát', 'thích khách'] },                    // chàm tối
  { colors: ['#2A1A1F', '#451F2B'], tags: ['tử', 'tử vong', 'oán', 'âm hồn'] },                              // huyết dụ
  { colors: ['#152030', '#1F3650'], tags: ['hắc ám', 'vực sâu', 'địa ngục', 'thâm uyên'] },                 // hắc thanh
  { colors: ['#2C2418', '#473A22'], tags: ['hổ phách', 'vàng kim', 'phú quý', 'hoàng kim'] },                // hổ phách tối
  { colors: ['#221A2C', '#382A4A'], tags: ['tử khí', 'u linh', 'âm giới'] },                                 // tử khôi
  { colors: ['#19262A', '#264046'], tags: ['đá', 'thạch', 'sơn nhạc', 'núi'] },                              // lam thạch
  { colors: ['#1F2B3D', '#3A5A6B'], tags: ['tiên', 'tu tiên', 'tiên giới', 'tiên nhân', 'trường sinh'] },   // xanh ngọc tiên giới
  { colors: ['#2A2418', '#4A3F26'], tags: ['phàm', 'phàm nhân', 'trần gian', 'thế tục', 'nhân gian'] },     // đất nâu phàm trần
  { colors: ['#2E1F12', '#5A3D1A'], tags: ['hồng hoang', 'thái cổ', 'khai thiên', 'nguyên thủy', 'hỗn độn'] }, // hổ phách hồng hoang
  { colors: ['#22301F', '#3D5A2E'], tags: ['thần thú', 'linh thú', 'thượng thú', 'cổ thú', 'long tộc', 'phượng hoàng'] }, // lục ngọc thần thú
];

export function randomPalette() {
  return PALETTES[Math.floor(Math.random() * PALETTES.length)].colors;
}

/** Chọn palette theo tần suất từ khóa chủ đề khớp trong tên truyện + mô tả; fallback random nếu không khớp. */
export function pickPaletteFor(name, description) {
  const text = `${name || ''} ${description || ''}`.toLowerCase();

  let best = null;
  let bestScore = 0;
  for (const p of PALETTES) {
    const score = p.tags.reduce((acc, tag) => acc + (text.includes(tag) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }

  return best ? best.colors : randomPalette();
}
