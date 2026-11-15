# Thư Viện Game

Trang HTML/CSS/JS thuần (không backend) hiển thị danh sách game dạng card, đọc dữ liệu từ Google
Sheet. Bấm nút **Đồng bộ** để tải lại dữ liệu mới nhất ngay trong trình duyệt. Tối ưu cho mobile và
cho công cụ tìm kiếm (toàn bộ danh sách được render sẵn thành HTML tĩnh, không cần chạy JS mới đọc
được nội dung).

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

Hoặc qua GitHub: push thư mục này lên repo, vào vercel.com → **New Project** → chọn repo đó →
để mặc định (Framework Preset: **Other**, không cần Build Command) → Deploy.

## Cấu trúc file

- `index.html` / `style.css`: giao diện, không phụ thuộc thư viện ngoài. Responsive cho mobile
  (toolbar 2 dòng, tab cuộn ngang, lưới 2 cột ở màn hẹp).
- `render.js`: các hàm **render thuần** (parse CSV, tạo HTML cho card/tab/thống kê, slugify…) —
  dùng chung bởi trình duyệt (`app.js`) **và** bước build (`build.js`), nên HTML build sẵn không
  bao giờ lệch với HTML JS tự vẽ lúc đồng bộ.
- `app.js`: logic phía trình duyệt — đọc dữ liệu nhúng sẵn, lưu/đọc `localStorage`, xử lý nút
  Đồng bộ, tìm kiếm, lọc tab, copy mật khẩu.
- `games_embedded.json`: ảnh chụp dữ liệu sheet gần nhất, dùng làm nguồn cho `build.js`.
- `build.js` **(chạy thủ công: `node build.js`)**: đọc `games_embedded.json`, render sẵn toàn bộ
  danh sách game thành HTML tĩnh ngay trong `index.html` (giữa các marker `<!--GRID_START-->…`),
  và nhúng dữ liệu JSON vào thẻ `<script type="application/json" id="embeddedGames">`. Nhờ vậy
  Google/Bing hay bất kỳ ai tắt JS vẫn đọc được đầy đủ 272 game ngay trong HTML gốc, và trình
  duyệt không cần gọi thêm request nào để hiện dữ liệu ban đầu. **Chạy lại lệnh này sau khi
  `games_embedded.json` thay đổi** (ví dụ sau khi nhờ Claude đồng bộ lại), rồi commit + deploy.
- `thumbs/<slug>.jpg`: ảnh bìa, đặt tên theo slug của tên game (bỏ dấu, bỏ ký tự đặc biệt) — khớp
  được cả khi thứ tự hàng trong sheet thay đổi. Game chưa có ảnh khớp sẽ hiện ô màu kèm chữ cái đầu.
- `og-image.png`, `favicon.svg`, `robots.txt`, `sitemap.xml`: tài nguyên SEO/chia sẻ mạng xã hội.

## Đồng bộ dữ liệu (sau khi sheet có game mới)

Bấm **Đồng bộ** trên trang chỉ cập nhật cho người đang xem (lưu ở `localStorage` trình duyệt họ).
Để ai mở trang lần đầu cũng thấy ngay dữ liệu mới nhất, cần hai bước:

```bash
# games_embedded.json cần được cập nhật trước (nhờ Claude, hoặc tự export lại)
node build.js
git add -A && git commit -m "Đồng bộ dữ liệu game" && git push
```

Vercel tự redeploy sau khi push nếu đã kết nối repo GitHub.

## SEO

- Thẻ `<title>`, `description`, Open Graph, Twitter Card, `canonical` đã điền sẵn — đổi domain thật
  trong `index.html`, `robots.txt`, `sitemap.xml` khi bạn gắn domain riêng (hiện đang để tạm
  `https://game-lib-inky.vercel.app/`).
- `robots.txt` + `sitemap.xml` ở thư mục gốc, trỏ đúng domain trên.
- Toàn bộ danh sách game được render sẵn thành HTML (xem mục `build.js` ở trên) thay vì chỉ hiện ra
  sau khi JS chạy xong — giúp công cụ tìm kiếm index được nội dung chắc chắn hơn.
- JSON-LD `WebSite` ở `<head>` mô tả trang cho công cụ tìm kiếm.

## Sheet nguồn

ID: `1EUtWgw48fTqmgkcHmZjqpW32h06C6JiB` (sheet phải ở chế độ chia sẻ "Anyone with the link can view").
Đổi ID này ở đầu file `render.js` (`SHEET_ID`) nếu cần trỏ sang sheet khác.

## Lưu ý

- `localStorage` là theo từng trình duyệt/máy — đồng bộ trên máy bạn không ảnh hưởng người khác xem
  trang. Muốn mọi người luôn thấy cùng một bản mới nhất ngay từ lần mở đầu tiên, làm theo mục
  "Đồng bộ dữ liệu" ở trên.
