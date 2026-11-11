# Thư Viện Game

Trang HTML/CSS/JS thuần (không backend, không build step) hiển thị danh sách game dạng card,
đọc dữ liệu từ Google Sheet. Bấm nút **Đồng bộ** để tải lại dữ liệu mới nhất ngay trong trình duyệt.

## Chạy thử ở máy

Không cần cài gì, chỉ cần một static server bất kỳ, ví dụ:

```bash
python3 -m http.server 5183
```

rồi mở `http://localhost:5183`.

## Deploy lên Vercel

Cách nhanh nhất — dùng Vercel CLI, không cần git:

```bash
npx vercel --prod
```

Chạy lệnh này ngay trong thư mục `game-library-web`, trả lời vài câu hỏi lúc đầu (Vercel tự nhận đây
là static site, không cần cấu hình build), xong sẽ ra link public.

Hoặc qua GitHub: đẩy thư mục này lên một repo, vào vercel.com → **New Project** → chọn repo đó →
để mặc định (Framework Preset: **Other**, không cần Build Command) → Deploy.

## Cách hoạt động

- `index.html` / `style.css` / `app.js`: toàn bộ giao diện, không phụ thuộc thư viện ngoài.
- `games_embedded.json`: ảnh chụp dữ liệu sheet tại thời điểm tạo trang — hiện ngay khi vừa mở trang,
  trước khi bấm Đồng bộ.
- Bấm **Đồng bộ**: trang gọi thẳng `fetch()` tới endpoint CSV công khai của Google Sheets cho cả 5 tab
  (`Game PC`, `Game Mobile`, `Game Mobile Java`, `Game Web Flash`, `Game Web H5`), parse CSV, hiển thị
  lại, và lưu kết quả vào `localStorage` của trình duyệt — lần mở sau trên cùng máy/trình duyệt đó sẽ
  tự dùng bản đã đồng bộ thay vì file snapshot gốc.
- `thumbs/<slug>.jpg`: ảnh bìa, đặt tên theo slug của tên game (bỏ dấu, bỏ ký tự đặc biệt) — khớp được
  cả khi thứ tự hàng trong sheet thay đổi. Game mới thêm trên sheet mà chưa có ảnh khớp sẽ hiện ô màu
  gradient kèm chữ cái đầu tên game thay vì ảnh.

## Sheet nguồn

ID: `1EUtWgw48fTqmgkcHmZjqpW32h06C6JiB` (sheet phải ở chế độ chia sẻ "Anyone with the link can view").
Đổi ID này ở đầu file `app.js` (`SHEET_ID`) nếu cần trỏ sang sheet khác.

## Lưu ý

- `localStorage` là theo từng trình duyệt/máy — đồng bộ trên máy bạn không ảnh hưởng người khác xem
  trang. Muốn mọi người luôn thấy cùng một bản mới nhất, cách đơn giản nhất là bấm Đồng bộ rồi deploy
  lại (ghi đè `games_embedded.json`), hoặc nói Claude làm việc đó giúp.
