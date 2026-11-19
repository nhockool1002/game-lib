# Thư viện tải game Miễn Phí

Card gallery game offline (PC/Mobile/Java/Flash/H5), dữ liệu từ Google Sheet. HTML/CSS/JS thuần,
không backend.

## Chạy local

```bash
python3 -m http.server 5183
```

## Deploy

```bash
npx vercel --prod
```

Hoặc import repo này trên vercel.com → Deploy (Framework: Other, không cần build command).

## File

- `index.html`, `style.css` — giao diện.
- `render.js` — logic render (CSV parse, card/tab/stats HTML), dùng chung bởi `app.js` và `build.js`.
- `app.js` — phía trình duyệt: đọc dữ liệu nhúng sẵn, `localStorage`, nút Đồng bộ, tìm kiếm, copy.
- `games_embedded.json` — snapshot dữ liệu sheet, dùng làm bản lưu khi sheet gốc không truy cập được.
- `scripts/sync-sheet.js` (`node scripts/sync-sheet.js`) — đọc toàn bộ tab sheet, ghi lại
  `games_embedded.json`. Không ghi gì nếu có tab lỗi, để không đè bản lưu cũ bằng dữ liệu rỗng/thiếu.
- `.github/workflows/sync-sheet.yml` — chạy script trên mỗi 3 giờ rồi build lại, tự push, và báo
  IndexNow nếu có thay đổi thật.
- `scripts/indexnow.js` (`node scripts/indexnow.js`) — gửi toàn bộ URL trong `sitemap.xml` tới
  IndexNow (Bing/Yandex/Naver đọc chung giao thức này) để các trang mới/đổi được biết tới ngay thay
  vì chờ tới lượt crawl định kỳ. Key xác thực nằm ở file `<key>.txt` tại gốc site.
- `build.js` (`node build.js`) — render sẵn grid/tabs/stats vào `index.html` và nhúng JSON, từ
  `games_embedded.json`. Chạy lại sau mỗi lần `games_embedded.json` đổi.
- `build-pages.js` (`node build-pages.js`) — tạo 1 trang riêng cho mỗi game tại `g/<slug>.html`
  (title/description/canonical/JSON-LD riêng, link tải + mật khẩu + game liên quan), và ghi lại
  `sitemap.xml` với toàn bộ URL. Mục đích: ai tìm tên một game cụ thể trên Google có trang riêng để
  trúng, thay vì phải cạnh tranh chung với 271 game khác trên trang chủ.
- `thumbs/<slug>.jpg` — ảnh bìa theo slug tên game.
- `og-image.png`, `favicon.svg`, `robots.txt`, `sitemap.xml`, `vercel.json` (cleanUrls, để
  `/g/<slug>` không cần đuôi `.html`) — SEO/share.

## Cập nhật dữ liệu

Tự động: `.github/workflows/sync-sheet.yml` chạy mỗi 3 giờ (`node scripts/sync-sheet.js` → `build.js`
→ `build-pages.js` → commit & push nếu có thay đổi → `scripts/indexnow.js` nếu vừa commit), Vercel tự
deploy lại theo commit đó. Nếu một tab sheet không đọc được, workflow dừng và không ghi gì cả —
`games_embedded.json` giữ nguyên bản cũ, nên dữ liệu không bao giờ mất dù sheet gốc có lúc không
truy cập được. Có thể chạy tay qua tab Actions trên GitHub (workflow_dispatch).

Thủ công:

```bash
node scripts/sync-sheet.js
node build.js
node build-pages.js
git add -A && git commit -m "Đồng bộ dữ liệu game" && git push
```

Nút Đồng bộ trên trang chỉ cập nhật `localStorage` của người xem, không ghi lại file nào — dùng để
xem dữ liệu mới nhất ngay mà không cần chờ build lại.

## Sheet

ID trong `render.js` (`SHEET_ID`): `1EUtWgw48fTqmgkcHmZjqpW32h06C6JiB`, cần share "Anyone with the
link can view".

## Domain

`https://khomienphi.io.vn` — cấu hình trong `index.html`, `robots.txt`, hằng số `SITE` trong
`build-pages.js` (sitemap.xml tự sinh lại từ đó). Domain cần được gắn thủ công trong Vercel
(Settings → Domains) và trỏ DNS tương ứng ở nơi mua domain.
