import net from 'net';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from '../ngoc-gian/lib.js';
import { getSettings } from './settings.js';
import storiesRouter from './routes/stories.js';
import settingsRouter from './routes/settings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Node 20.x có bug ERR_INTERNAL_ASSERTION trong internalConnectMultiple (thuật toán
// Happy Eyeballs dual-stack IPv4/IPv6) khi có nhiều kết nối HTTP đồng thời — đúng tình
// huống crawl/import chạy song song nhiều luồng ở đây. Tắt auto-select-family để outbound
// request luôn nối bằng 1 stack, tránh code path bị lỗi này ngay từ đầu.
net.setDefaultAutoSelectFamily(false);

// Server chạy dài hạn — 1 lỗi mạng thoáng qua không được phép làm sập cả dashboard.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server tiếp tục chạy):', err);
});
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection (server tiếp tục chạy):', err);
});

loadEnv(getSettings().envPath);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', storiesRouter);
app.use('/api', settingsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Bảng Điều Khiển — Thiên Các · Crawl & Import`);
  console.log(`http://localhost:${PORT}`);
});
