# Bé Vui Học — Hướng dẫn chạy & cách tính điểm

Trò chơi học chữ, số và kỹ năng cho trẻ mầm non. Toàn bộ giao diện nằm trong
`index.html`; phần logic thuần (sinh câu hỏi, tính toán) được tách sang
`src/logic.js` để kiểm thử độc lập.

---

## 1. Cách chạy

### a) Chơi trên máy

Ứng dụng là web tĩnh, **không cần cài đặt gì để chơi**. Có 3 cách:

| Cách | Lệnh / thao tác | Ghi chú |
|------|-----------------|---------|
| Mở trực tiếp | Nháy đúp `index.html` | Nhanh nhất. Mở bằng `file://` vẫn chạy vì `src/logic.js` nạp bằng thẻ `<script src>` thường. |
| Chạy máy chủ tĩnh | `python3 -m http.server 8000` rồi mở `http://localhost:8000` | Giống môi trường thật nhất (khuyên dùng). |
| Bản đã triển khai | Mở trang GitHub Pages của repo | App được deploy tự động qua GitHub Pages từ nhánh `main`. |

> **Mẹo:** vài tính năng (đọc tiếng — TTS) chỉ hoạt động sau lần chạm/bấm đầu
> tiên của người dùng, và cần trình duyệt có giọng tiếng Việt.

### b) Chạy bộ kiểm thử (dành cho lập trình viên)

```bash
npm install      # cài phụ thuộc (chỉ cần làm 1 lần)
npm test         # chạy toàn bộ test Vitest một lượt
npm run test:watch   # chạy lại tự động mỗi khi sửa code
```

Bộ test kiểm tra các hàm logic trong `src/logic.js` (sinh câu hỏi toán, ghép
chữ, ghép cặp, nối chấm…). CI trên GitHub Actions (`.github/workflows/test.yml`)
tự chạy `npm test` cho mỗi pull request và mỗi lần đẩy vào `main`.

---

## 2. Cách tính điểm (⭐)

Mỗi lần bé làm đúng sẽ được cộng sao vào tổng điểm hiển thị ở góc trên.

| Chế độ | Hành động được cộng điểm | Điểm |
|--------|--------------------------|-----:|
| 🔤 Tìm chữ / 🔢 Tìm số / 🧮 Đố vui toán / 🔊 Nghe âm | Chọn đúng đáp án | **+10** |
| 🔡 Ghép chữ | Mỗi **chữ cái** đặt đúng | **+5** |
| 🃏 Ghép cặp | Mỗi **cặp** giống nhau | **+10** |
| ✍️ Tập viết (nối chấm) | Nối xong **một chữ** | **+10** |
| 🧩 Ghép hình | Ghép **xong** bức tranh | **+10** |
| 🎨 Tô màu | Mỗi ô tô lần đầu | **+1** |

Điểm số được **lưu lại** giữa các lần chơi (xem mục 4) và chỉ về 0 khi bấm nút
đặt lại (reset).

---

## 3. Cấp độ Dễ / Vừa / Khó

Ba cấp độ là **mức khó do người chơi tự chọn** bằng nút trên màn hình — *không*
phải mở khoá bằng điểm. Chọn cấp nào thì các câu hỏi khó theo cấp đó:

| Yếu tố | Dễ | Vừa | Khó |
|--------|---:|----:|----:|
| Số ô lựa chọn | 6 | 9 | 12 |
| Khoảng số (tìm số) | 0–10 | 0–20 | 0–30 |
| Phép cộng tối đa | 5 | 10 | 15 |
| Phép trừ (số bị trừ tối đa) | 5 | 15 | 25 |
| So sánh số tối đa | 10 | 20 | 30 |
| Đếm tối đa | 5 | 8 | 10 |
| Số đáp án của câu toán | 3 | 4 | 5 |
| Độ dài từ (ghép chữ) | 2 | 3 | 3–4 |
| Ô gây nhiễu (ghép chữ) | 0 | 1 | 2 |
| Số cặp (ghép cặp) | 6 | 8 | 10 |

*(Bảng này chính là cấu hình `LEVELS`/`CFG` mà bộ test dùng để kiểm chứng.)*

Một số ràng buộc luôn đúng ở mọi cấp (đã được test bảo vệ):
- Phép trừ **không bao giờ ra số âm**.
- Danh sách đáp án luôn **chứa đáp án đúng** và không có số âm.
- Trong "Nghe âm", các ô gây nhiễu **không trùng âm** với chữ mục tiêu.

---

## 4. "Lên hạng": mục tiêu ngày, chuỗi ngày & huy hiệu

Thay vì lên level bằng điểm, bé tiến bộ qua 3 hệ thống dựa trên **số câu trả lời
đúng** (mỗi câu đúng ở các chế độ có ⭐ đều được tính; riêng Tô màu không tính):

### 🎯 Mục tiêu ngày
Đạt **10 câu đúng trong ngày** là hoàn thành mục tiêu hôm đó. Bộ đếm tự đặt lại
về 0 khi sang ngày mới.

### 🔥 Chuỗi ngày (streak)
Mỗi ngày đạt mục tiêu sẽ **+1** vào chuỗi. Nếu bỏ lỡ một ngày, chuỗi đặt lại về 1
ở lần đạt mục tiêu kế tiếp. Chuỗi hiển thị dạng "🔥 N ngày".

### 🏅 Huy hiệu (theo tổng số câu đúng tích luỹ)
Huy hiệu mở dần và **không mất đi**:

| Mốc câu đúng | Huy hiệu |
|-------------:|----------|
| 5 | 🌟 Ngôi sao nhỏ |
| 15 | 🏅 Huy chương đồng |
| 30 | 🥈 Huy chương bạc |
| 50 | 🥇 Huy chương vàng |
| 80 | 🏆 Cúp vô địch |
| 120 | 👑 Nhà vô địch nhí |

Thanh tiến trình trên màn hình cho biết còn bao nhiêu câu đúng nữa để mở huy
hiệu tiếp theo.

---

## 5. Lưu tiến trình

Điểm số, số câu đúng, mục tiêu ngày, chuỗi ngày và huy hiệu được lưu tự động trong
trình duyệt (`localStorage`) nên vẫn còn khi mở lại. Dùng nút **đặt lại (reset)**
trong bảng thống kê nếu muốn xoá và bắt đầu lại từ đầu.

---

## 6. Cấu trúc dự án

| Đường dẫn | Vai trò |
|-----------|---------|
| `index.html` | Toàn bộ giao diện + luồng chơi (nạp `src/logic.js`). |
| `src/logic.js` | Logic thuần, không chạm DOM — dùng chung cho app và test. |
| `test/logic.test.js` | Bộ kiểm thử Vitest cho các hàm logic. |
| `.github/workflows/test.yml` | CI chạy `npm test`. |
| `manifest.webmanifest`, `sw.js`, `icon-*.png` | Cấu hình PWA (cài như ứng dụng, chơi offline). |
