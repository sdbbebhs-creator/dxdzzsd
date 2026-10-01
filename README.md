# FSRS Ôn Tập Thông Minh

Ứng dụng học từ vựng & ngữ pháp tiếng Anh với thuật toán lặp lại ngắt quãng FSRS v4.

## Kiến trúc

- **Frontend**: React 19 + Vite, TypeScript.
- **Xác thực**: Supabase Auth (Email/Password).
- **Lưu trữ dữ liệu**: Netlify DB (Postgres qua Drizzle ORM) — mỗi từ vựng/ngữ pháp được lưu theo tài khoản người dùng, đồng bộ trên mọi thiết bị. Bản sao cục bộ (IndexedDB/localStorage) vẫn được giữ để dùng ngay cả khi mất mạng.
- **AI hỗ trợ**: Netlify Functions gọi Gemini API để tra cứu từ vựng/ngữ pháp và tối ưu tham số FSRS, có chế độ dự phòng offline khi không có API key.

## Giao diện

- **Bố cục**: thanh điều hướng bên trái trên máy tính (thu gọn thành cột biểu tượng ở màn hình vừa), thanh tiêu đề theo ngữ cảnh ở trên, thanh điều hướng dưới cùng + nút thêm nổi trên điện thoại.
- **Design tokens**: bảng màu trung tính, màu thương hiệu, bóng đổ, font (Be Vietnam Pro + JetBrains Mono) được khai báo một lần trong `@theme` ở `src/index.css`.
- **Phím tắt**: `N` mở cửa sổ thêm mới, `1`–`6` chuyển nhanh giữa các mục (tắt khi đang ở Thẻ lật và Game).

## Chạy trên máy

```bash
npm install
netlify dev
```

## Luyện Output 5 ngữ cảnh (Gemini)

Khi mở cửa sổ luyện output của một từ vựng hoặc cấu trúc ngữ pháp:

1. Gemini gợi ý 5 ngữ cảnh thực tế phù hợp nhất với từ/cấu trúc đó và hiển thị thành 5 tab (có skeleton khi đang tải). Nếu AI lỗi hoặc bị giới hạn lượt gọi (429), app tự dùng 5 tab mặc định: Đời sống, Công sở, Trường học, Mạng xã hội, Tự do.
2. Mỗi tab tự sinh một câu mẫu kèm bản dịch; nút "Đổi câu mẫu" sinh câu khác. Các nút bị khóa tạm thời trong lúc gọi API để tránh spam.
3. Bấm "Xác nhận" để Gemini chấm điểm /100, sửa ngữ pháp, nhận xét bằng tiếng Việt và gợi ý cách nói tự nhiên hơn. Nếu AI không phản hồi, app chấm nhanh offline.

Tất cả lượt gọi đi qua Netlify Function `/api/ai/context-practice`, nên API key không bao giờ lộ ra trình duyệt.

## Trợ Lý Đo Nhịp Trí Nhớ

Mở từ tab **Thống kê** hoặc thanh điều hướng. Trợ lý:

1. Đo nhịp nhớ thật của bạn: tỷ lệ nhớ khi ôn lại (chỉ tính các lượt ôn thẻ đã có lịch hẹn; Hard/Good/Easy = nhớ, Again = quên), số thẻ ôn mỗi ngày trong 30 ngày qua và tiến độ tới mốc 1.000 lượt.
2. Cho bạn chọn phong cách học (thi cấp tốc / bền vững / theo sở thích).
3. Đề xuất ngay mức ghi nhớ mục tiêu kèm ước tính số thẻ phải ôn mỗi ngày tăng/giảm bao nhiêu, và lý do cụ thể. Nút "Nhờ AI giải thích thêm" gọi `/api/ai/optimize-fsrs` để Gemini viết lời khuyên; con số đề xuất luôn được tính bằng cùng một quy tắc (`src/utils/memoryRhythm.ts`) trên cả trình duyệt và server.

### Cài đặt FSRS cá nhân

Trong trợ lý → mục **3. Cài Đặt Thuật Toán FSRS**:

- **Tập tham số riêng (Weights):** mặc định dùng bộ tiêu chuẩn của ts-fsrs (21 tham số). Từ 400 lượt ôn (khuyến nghị 1.000), bấm tối ưu để phân tích lịch sử học ngay trên trình duyệt và áp dụng bộ tham số riêng (có thể quay về bộ tiêu chuẩn).
- **Tỷ lệ ghi nhớ mục tiêu:** 80%–95%. Cao hơn → ôn dày hơn; 80–85% → khoảng cách dài hơn, tiết kiệm thời gian.
- **Khoảng cách tối đa:** 180 / 365 / 1.000 / 3.650 ngày hoặc tự nhập (mặc định 365).
- **Bước học ban đầu:** bật/tắt các bước ngắn (vd `10m 30m`) cho thẻ mới trước khi chuyển sang lịch theo ngày.

Cài đặt lưu trên thiết bị (localStorage) và áp dụng cho các lượt ôn tiếp theo.

## Chạy ở local

**Yêu cầu:** Node.js

1. Cài dependencies:
   ```
   npm install
   ```
2. Sao chép `.env.example` thành `.env.local` và điền `GEMINI_API_KEY` nếu muốn dùng tính năng AI (không bắt buộc, có fallback offline).
3. Chạy app:
   ```
   npm run dev
   ```

## Deploy

Dự án được cấu hình sẵn cho Netlify (`netlify.toml`):

- `npm run build` build ra `dist/`.
- `netlify/functions/*.mts` xử lý các chức năng AI/FSRS phụ trợ; dữ liệu người dùng được lưu và đồng bộ trực tiếp qua Supabase.
- Schema Postgres nằm ở `db/schema.ts`, migration nằm ở `netlify/database/migrations/` (sinh bằng `npx drizzle-kit generate`, Netlify tự áp dụng khi deploy).

## Xác thực & Đồng bộ

Người dùng đăng nhập bằng Email/Mật khẩu qua Supabase. Thẻ và tiến độ FSRS được lưu trên Supabase theo 3 bảng:

- `vocab_items` / `grammar_items`: nội dung từng thẻ (mỗi thẻ 1 dòng).
- `study_data`: thông số FSRS của từng thẻ (`user_id`, `item_id`, `status`, `stability` = S, `difficulty` = D, `last_review`, `next_review`, ...).

Mọi thay đổi (thêm, sửa, xóa, ôn tập) được ghi lên Supabase trước rồi mới hiện trên giao diện; nếu lỗi sẽ có thông báo đỏ. Supabase Realtime đẩy thay đổi sang các thiết bị khác ngay lập tức, không cần tải lại trang. Ba bảng duy nhất là `vocab_items`, `grammar_items` và `study_data`; `study_data` là nguồn sự thật duy nhất cho FSRS, Rank/EXP/Streak, settings và lịch sử ôn.

**Thiết lập Supabase:** chạy lần lượt các file trong `supabase/migrations/` trong Supabase SQL Editor (file mới nhất `20261001000000_study_data_per_item.sql` tạo bảng `study_data` theo từng thẻ và bật Realtime cho cả 3 bảng).
