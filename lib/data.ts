export type Story = {
  id: string;          // slug — dùng cho URL & routing
  dbId: number;        // bigint ID trong DB — dùng để query chapters/content
  title: string;
  han: string;
  hanShort: string;
  han1: string;
  han2: string;
  author: string;
  translator: string;
  genre: string;
  tags: string[];
  status: 'ongoing' | 'completed' | 'paused' | 'dropped';
  chapters: number;
  words: string;       // formatted: "9.4M"
  rating: number;
  readers: string;     // formatted: "5.2M"
  reviews: string;     // formatted: "12.4K"
  palette: [string, string];
  sealColor: string;
  desc: string;
  // Metadata từ DB — dùng bởi home.tsx để derive featured/ranking
  isFeatured?: boolean;
  featuredOrder?: number;
  featuredQuote?: string;
  weeklyViews?: number;
  monthlyViews?: number;
  lastChapterAt?: string;
  createdAt?: string;
};

export type Chapter = {
  num: number;
  name: string;
  date: string;
  read: boolean;
};
