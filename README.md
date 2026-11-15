# Thư Viện Game

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
- `games_embedded.json` — snapshot dữ liệu sheet.
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

```bash
node build.js
node build-pages.js
git add -A && git commit -m "Đồng bộ dữ liệu game" && git push
```

Nút Đồng bộ trên trang chỉ cập nhật `localStorage` của người xem; muốn ai mở lần đầu cũng thấy dữ
liệu mới thì cần chạy `build.js` rồi deploy lại.

## Sheet

ID trong `render.js` (`SHEET_ID`): `1EUtWgw48fTqmgkcHmZjqpW32h06C6JiB`, cần share "Anyone with the
link can view".

## Domain

Đang để tạm `https://game-lib-inky.vercel.app/` trong `index.html`, `robots.txt`, `sitemap.xml` —
đổi khi gắn domain riêng.
