export type Story = {
  id: string;
  title: string;
  han: string;
  hanShort: string;
  han1: string;
  han2: string;
  author: string;
  translator: string;
  genre: string;
  tags: string[];
  status: "ongoing" | "completed";
  chapters: number;
  words: string;
  rating: number;
  readers: string;
  reviews: string;
  palette: [string, string];
  sealColor: string;
  desc: string;
};

export type Chapter = {
  num: number;
  name: string;
  date: string;
  read: boolean;
};

export const STORIES: Story[] = [
  {
    id: "phamnhan",
    title: "Phàm Nhân Tu Tiên Truyện",
    han: "凡人修仙傳",
    hanShort: "凡人",
    han1: "凡",
    han2: "人",
    author: "Vong Ngữ",
    translator: "Nhóm dịch Tu Tiên",
    genre: "Tiên hiệp",
    tags: ["Tu tiên", "Trùng sinh", "Main bá", "Hệ thống"],
    status: "completed",
    chapters: 2448,
    words: "9.4M",
    rating: 4.9,
    readers: "5.2M",
    reviews: "12.4K",
    palette: ["#2E1A18", "#561420"],
    sealColor: "#8B2331",
    desc: "Một câu chuyện về Hàn Lập — thiếu niên xuất thân tầm thường ở thôn quê hẻo lánh, bằng sự cẩn trọng cùng kiên nhẫn, từng bước bước lên đỉnh tu tiên giới. Không tài năng đặc biệt, không bối cảnh hiển hách, chỉ có một quả tim không cam chịu và đôi bàn tay biết chờ thời. Phàm nhân làm sao trường sinh? Tự mình đi tìm câu trả lời.",
  },
  {
    id: "kiemlai",
    title: "Kiếm Lai",
    han: "劍來",
    hanShort: "劍來",
    han1: "劍",
    han2: "來",
    author: "Phong Hoả Hí Chư Hầu",
    translator: "Thiên Các",
    genre: "Tiên hiệp",
    tags: ["Kiếm tu", "Đông phương", "Văn phong đẹp"],
    status: "ongoing",
    chapters: 1247,
    words: "6.8M",
    rating: 4.8,
    readers: "3.1M",
    reviews: "8.2K",
    palette: ["#1F2D1F", "#2E5447"],
    sealColor: "#8B2331",
    desc: "Trần Bình An — một cậu bé mồ côi của thôn nhỏ Lệ Châu, sống nhờ nghề đốt than. Hắn không có tư chất luyện kiếm, nhưng tâm hồn lại trong trẻo như nước suối đầu nguồn. Một ngày nọ, vận mệnh khiến hắn nhặt được lưỡi kiếm gãy của một vị tiên nhân đã sa cơ.",
  },
  {
    id: "giathien",
    title: "Già Thiên",
    han: "遮天",
    hanShort: "遮天",
    han1: "遮",
    han2: "天",
    author: "Thần Đông",
    translator: "Vong Niệm",
    genre: "Huyền huyễn",
    tags: ["Cổ phong", "Bi tráng", "Đại thế giới"],
    status: "completed",
    chapters: 1817,
    words: "8.1M",
    rating: 4.7,
    readers: "4.6M",
    reviews: "9.8K",
    palette: ["#3D2530", "#2D1B1F"],
    sealColor: "#8B2331",
    desc: "Mặt trời rồi cũng sẽ tắt, sao trời rồi cũng sẽ tàn. Khi vạn vật quy về tịch diệt, ai có thể nắm giữ một tia sống cuối cùng? Diệp Phàm cùng chín người bạn cấp ba bước vào chuyến tàu vũ trụ định mệnh — đi tìm câu trả lời ở tận cùng tinh không.",
  },
  {
    id: "tieudao",
    title: "Tiêu Dao Tiểu Thư Sinh",
    han: "逍遙小書生",
    hanShort: "逍遙",
    han1: "逍",
    han2: "遙",
    author: "Tuyết Mãn Lương",
    translator: "Nhất Mộng",
    genre: "Kiếm hiệp",
    tags: ["Văn nhân", "Hài hước", "Cổ đại"],
    status: "ongoing",
    chapters: 524,
    words: "2.2M",
    rating: 4.6,
    readers: "892K",
    reviews: "3.1K",
    palette: ["#2A3A48", "#3A5266"],
    sealColor: "#8B2331",
    desc: "Một tiểu thư sinh xuyên không thành chàng thư sinh nghèo, không võ công không công danh, chỉ có một bụng thơ phú và miệng lưỡi sắc bén. Vận mệnh đưa hắn vào triều đình, vào giang hồ, vào cả lòng người.",
  },
  {
    id: "tuchantuvannien",
    title: "Tu Chân Tứ Vạn Niên",
    han: "修真四萬年",
    hanShort: "修真",
    han1: "修",
    han2: "真",
    author: "Ngoạ Ngưu Chân Nhân",
    translator: "Thiên Các",
    genre: "Huyền huyễn",
    tags: ["Khoa huyễn", "Hệ thống", "Mạt thế"],
    status: "completed",
    chapters: 1602,
    words: "7.3M",
    rating: 4.8,
    readers: "2.4M",
    reviews: "5.6K",
    palette: ["#1A2942", "#0F1B2D"],
    sealColor: "#8B2331",
    desc: "Bốn vạn năm trước, tu chân giới phồn thịnh đỉnh cao. Bốn vạn năm sau, chỉ còn lại ngọn lửa tàn. Lý Diệu Nhất từ thời cổ tu chân giới trở lại, đối mặt với một thế giới đã hoàn toàn đổi khác.",
  },
  {
    id: "dautrieu",
    title: "Đại Phụng Đả Canh Nhân",
    han: "大奉打更人",
    hanShort: "大奉",
    han1: "大",
    han2: "奉",
    author: "Mại Báo Tiểu Lang Quân",
    translator: "Hắc Phong",
    genre: "Huyền huyễn",
    tags: ["Phá án", "Cổ đại", "Trí tuệ"],
    status: "ongoing",
    chapters: 982,
    words: "5.1M",
    rating: 4.9,
    readers: "3.8M",
    reviews: "11.2K",
    palette: ["#2B2018", "#3D2A1B"],
    sealColor: "#8B2331",
    desc: "Hứa Thất An — một thanh tra cảnh sát hiện đại tỉnh dậy trong cơ thể một tên tù khốn khổ của Đại Phụng vương triều. Từ ngục tối bước ra, hắn dùng tư duy phá án hiện đại để tung hoành giang hồ phong ba dày đặc.",
  },
];

const CHAPTER_NAMES = [
  "Sơn thôn thiếu niên", "Thất tinh hồng truyền công", "Lục lâm phiên thế", "Sơ luyện đan dược",
  "Tâm cảnh đan thuốc", "Trúc cơ kỳ", "Pháp bảo đầu tiên", "Lưu Quang phái", "Vong Bình bí cảnh",
  "Tham lam ý dục", "Hắc ám sơn cốc", "Bốn vị sư huynh", "Bất tử dược", "Linh khí phục tô",
  "Đan kinh đoạn chương", "Hỏa thuộc tính công pháp", "Bính lệ song kiếm", "Bích lưu tông", "Tâm ma kiếp",
  "Trúc cơ đại viên mãn", "Kết đan sơ kỳ", "Tử mẫu thiên la kiếm", "Bí cảnh kì ngộ", "Mặc Bình tiên cảnh",
  "Hóa kiếp đại thành", "Nguyên anh kỳ", "Cửu thiên thập địa", "Vô tận hải vực", "Long đảm thảo", "Thanh nguyên các đệ tử",
];

export const CHAPTERS: Chapter[] = Array.from({ length: 30 }, (_, i) => ({
  num: i + 1,
  name: CHAPTER_NAMES[i] ?? `Chương ${i + 1}`,
  date: i < 5 ? "Hôm nay" : i < 10 ? "Hôm qua" : `${Math.floor((i - 5) / 2)} ngày trước`,
  read: i < 12,
}));

export const CHAPTER_TEXT = `Hàn Lập ngẩng đầu nhìn lên bầu trời xanh thẳm, đôi mắt khẽ nheo lại. Đã ba ngày liền, hắn không ngủ. Cơ thể tuy mỏi mệt nhưng tinh thần lại vô cùng minh mẫn — như một dây đàn được kéo căng đến tột độ, chỉ chờ một tiếng vang mà bật ra.

Trong đan điền, một luồng linh khí mỏng manh đang chầm chậm xoay vòng. Đây là lần đầu tiên hắn cảm nhận được nó một cách rõ ràng như vậy. Suốt bao nhiêu năm khổ luyện, từng ngày ngồi tĩnh tâm dưới gốc cổ thụ, từng đêm đối diện ngọn đèn dầu leo lét — cuối cùng cũng có thành quả.

"Trúc cơ kỳ…" hắn thầm thì. Hai chữ ấy đối với người tầm thường mà nói là cả một giấc mơ xa vời, nhưng đối với hắn lại chỉ là khởi đầu. Phía trước còn dài, phía trước là vạn dặm núi sông cần phải đi qua. Là Kim Đan, là Nguyên Anh, là Hóa Thần, là Luyện Hư Hợp Đạo — là trường sinh.

Có tiếng bước chân nhẹ vang lên phía sau. Hàn Lập không cần quay đầu cũng biết là Mặc Đại Phu — vị lão giả đã âm thầm chỉ điểm hắn suốt mấy năm qua. Lão không nói gì, chỉ đặt một bình gốm nhỏ lên phiến đá bên cạnh, rồi lặng lẽ rời đi.

"Sư phụ…" Hàn Lập khẽ gọi, nhưng tiếng ấy bị gió núi cuốn đi mất.

Đêm hôm ấy, hắn ngồi trước phiến đá, nắp bình gốm mở ra, một mùi hương đan dược thơm ngát bốc lên. Hai viên đan dược màu lục đậm nằm im lìm — Trúc Cơ Đan. Vật mà người tu tiên cả đời mơ ước, vậy mà lão sư phụ tặng cho hắn hai viên không một chút do dự.

Hàn Lập đặt một viên lên môi. Đan dược tan ra rất nhanh, một luồng nhiệt khí cuồn cuộn chảy vào kinh mạch, va đập với linh khí trong đan điền. Hắn cắn răng, dồn toàn bộ tâm thần vào việc dẫn dắt — đây là khoảnh khắc quyết định.`;
