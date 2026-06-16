const KEY = "tvc_username";

const NAMES = [
  "Lưu Bồng", "Hàn Lập", "Vương Lâm", "Diệp Phàm", "Tiêu Viễn",
  "Đường Tam", "Thạch Hạo", "Lâm Động", "Dương Khai", "Mặc Phi Phi",
  "Cố Thanh Sơn", "Tần Mục", "Phương Trạc", "Chu Nguyên", "Lý Thất Dạ",
  "Bạch Tiểu Thuần", "Diệp Hắc Tu", "Tống Thu Thủy", "Hạ Tiểu Liên", "Dạ Phi Vân",
  "Trần Bình An", "Tống Tập Tân", "Sở Dương", "Vương Đỉnh", "Lăng Thiên",
  "Cố Nguyệt", "Hồng Lâu", "Tô Minh", "Diệp Tinh Thần", "Mộ Dung Tuyết",
];

function randomName() {
  return NAMES[Math.floor(Math.random() * NAMES.length)];
}

export function getUsername(): string {
  if (typeof window === "undefined") return NAMES[0];
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return stored;
    const picked = randomName();
    localStorage.setItem(KEY, picked);
    return picked;
  } catch {
    return randomName();
  }
}
