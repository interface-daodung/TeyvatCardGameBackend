# Đặc tả phần mềm (Final) – Teyvat Card Game Backend & Admin

## 1) Mục tiêu hệ thống

Hệ thống phục vụ game thẻ bài Teyvat theo mô hình 3 phần:
- `server`: API backend, xác thực, dữ liệu game, thanh toán, quản trị hệ thống.
- `admin-web`: giao diện quản trị vận hành nội dung và dữ liệu.
- `TeyvatCard`: mã nguồn client game (logic nhân vật, thẻ bài, save game).

Mục tiêu là cho phép vận hành game end-to-end: quản lý người chơi, nội dung game, tài nguyên ảnh/atlas, bản địa hóa, theme, cấu hình server, thanh toán và nhật ký/audit.

---

## 2) Cấu trúc thư mục tổng quan (đọc từ cây thư mục)

### Root
- `.cursor`
- `.vscode`
- `admin-web`
- `server`
- `TeyvatCard`

### `server/src` (chính)
- `controllers/`
- `middleware/`
- `models/`
- `routes/`
- `services/`
- `scripts/`
- `prompts/`
- `utils/`
- `index.ts`

### `admin-web/src` (chính)
- `components/`
  - `adventureCards/`, `assets/`, `characters/`, `dashboard/`, `database/`, `equipment/`, `layout/`, `localization/`, `maps/`, ...
- `pages/`
- `services/`
- `lib/`
- `App.tsx`
- `main.tsx`

### `TeyvatCard/src` (ví dụ đã xác nhận)
- `models/cards/character/Furina.ts`

---

## 3) Đặc tả chức năng hiện có

## 3.1 Xác thực & tài khoản
- Admin/User login, register, refresh token, logout.
- Hỗ trợ Google login.
- Verify email.
- Endpoint `me` để lấy thông tin phiên đăng nhập.
- Lưu trạng thái save game theo người dùng.
- Lưu thời điểm xem thông báo gần nhất.

## 3.2 Quản lý người dùng
- Danh sách user, chi tiết user.
- Ban/unban người dùng.
- Cập nhật xu.
- Ban/unban thẻ của user.
- Thu hồi refresh token.
- Verify email và đổi mật khẩu thủ công.

## 3.3 Thanh toán
- Quản lý giao dịch: list/detail/stats/update trạng thái.
- Tạo payment link cho admin.
- API PayOS: tạo link thanh toán cho admin và game client, truy vấn order theo `orderCode`.

## 3.4 Quản lý dữ liệu game
- CRUD `Characters`.
- CRUD `Adventure Cards`.
- CRUD `Maps`.
- CRUD `Items` (equipment).
- Quản lý cấu hình phiên bản server (`server-configuration-versions`): list, latest, compare, sync, check update.

## 3.5 Localization & Theme
- CRUD localization key/value.
- Kiểm tra thiếu key (`missing`).
- Dịch text qua endpoint translate.
- CRUD themes.

## 3.6 Quản lý assets, file và atlas
- Duyệt cây ảnh/tệp (`image-tree`, `uploaded-tree`, `atlas-list`).
- Upload/rename/move/delete file trong nhóm uploaded/cards/assets.
- Chuyển đổi ảnh sang webp, resize, stage preview, commit/discard.
- Sinh atlas custom, atlas animation, all-cards atlas.
- Xuất atlas/animation sang phía game (`export-to-teyvat`).
- Tạo spritesheet best-grid/resize variants.
- Lưu/compose animation spritesheet.
- Truy xuất metadata file.

## 3.7 Quản lý mã nguồn class thẻ trong admin
- Duyệt cây class thẻ (`card-class-tree`).
- Đọc/sửa/lưu source class thẻ.
- Build TSDoc class thẻ.
- Lấy AST map cho class nhân vật.

## 3.8 Thông báo, log, dashboard
- Stream thông báo realtime.
- Lấy danh sách thông báo phân trang.
- Dashboard stats.
- Log list/detail.

## 3.9 AI & quản trị CSDL
- Chat AI trong admin (`/api/ai/chat`).
- Scan cấu trúc database.
- Apply migration operations (chỉ role admin).

## 3.10 Chức năng giao diện admin-web
- Các trang chính:
  - Dashboard
  - Users/User detail
  - Payments + Create Payment Link
  - Characters, Equipment, Adventure Cards, Maps
  - Localization
  - Themes
  - Manager Assets
  - Server Configuration Versions
  - Logs
  - Calculate Movement (nhúng tool HTML)
  - AI Manage
  - Database Management
  - About
- Khung điều hướng có nhóm chức năng, tìm kiếm nhanh theo prefix (`users:`, `local:`, `pays:`, `logs:`), thông báo realtime, lịch sử recent links.

## 3.11 Client game (`TeyvatCard`)
- Có mô hình class nhân vật/thẻ (ví dụ `Furina`), tích hợp cấu hình thẻ, cơ chế sát thương/hồi máu và thuộc tính gameplay.
- Backend đã hỗ trợ endpoint `save-game` để client đồng bộ tiến trình.

## 3.12 Thành phần khác của `TeyvatCard/src` (bổ sung)

### Trang/module: `TeyvatCard/src/modules/Card.ts`
- Là lớp nền tảng (base class) cho toàn bộ card trong game.
- Định nghĩa `CardDefault` (schema config chung cho character/enemy/weapon/coin/...).
- Tổ chức logic hiển thị card: ảnh, border, text, token element, info dialog.
- Liên kết các manager lõi như localization, theme, data để đồng bộ UI + dữ liệu runtime.
- Là điểm mở rộng để các lớp con (`Character`, `Enemy`, `Equipment`,...) kế thừa.

### Liên quan: `TeyvatCard/src/modules/typeCard/character.ts`
- Kế thừa từ `Card`, triển khai logic riêng cho card nhân vật.
- Quản lý HP, shield, vũ khí, cooldown burst, animation theo level.
- Là nền cho các class cụ thể như `Furina`, `Venti`, `Nahida`,...

---

## 4) Danh sách API chi tiết (full endpoint hiện có)

Lưu ý:
- Base URL backend: theo môi trường deploy.
- Tiền tố API chính: `/api/*`.
- Một số endpoint yêu cầu `authenticate` và `authorize` theo role (`admin`, `moderator`).

### 4.1 System
- `GET /health`

### 4.2 Auth API (`/api/auth`)
- `POST /api/auth/login`
- `POST /api/auth/login-user`
- `POST /api/auth/register`
- `GET /api/auth/verify-email`
- `POST /api/auth/google`
- `GET /api/auth/me`
- `PATCH /api/auth/last-viewed-notifications`
- `GET /api/auth/save-game`
- `PUT /api/auth/save-game`
- `POST /api/auth/client-log-error`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### 4.3 Users API (`/api/users`)
- `GET /api/users/`
- `GET /api/users/:id`
- `PATCH /api/users/:id/ban`
- `PATCH /api/users/:id/xu`
- `POST /api/users/:id/ban-card`
- `POST /api/users/:id/unban-card`
- `POST /api/users/:id/revoke-refresh-token`
- `POST /api/users/:id/verify-email`
- `POST /api/users/:id/change-password`

### 4.4 Payments API (`/api/payments`)
- `GET /api/payments/stats`
- `GET /api/payments/`
- `GET /api/payments/:id`
- `PATCH /api/payments/:id/status`

### 4.5 PayOS API (`/api/payos`)
- `POST /api/payos/create-link`
- `POST /api/payos/create-link-game`
- `GET /api/payos/order/:orderCode`

### 4.6 Characters API (`/api/characters`)
- `GET /api/characters/`
- `GET /api/characters/:id`
- `POST /api/characters/`
- `PATCH /api/characters/:id`
- `DELETE /api/characters/:id`

### 4.7 Adventure Cards API (`/api/adventure-cards`)
- `GET /api/adventure-cards/`
- `GET /api/adventure-cards/:id`
- `POST /api/adventure-cards/`
- `PATCH /api/adventure-cards/:id`
- `DELETE /api/adventure-cards/:id`

### 4.8 Maps API (`/api/maps`)
- `GET /api/maps/`
- `GET /api/maps/:id`
- `POST /api/maps/`
- `PATCH /api/maps/:id`
- `DELETE /api/maps/:id`

### 4.9 Items API (`/api/items`)
- `GET /api/items/`
- `POST /api/items/`
- `GET /api/items/:id`
- `PATCH /api/items/:id`
- `DELETE /api/items/:id`

### 4.10 Localization API (`/api/localization`)
- `GET /api/localization/`
- `GET /api/localization/missing`
- `POST /api/localization/translate`
- `GET /api/localization/:key`
- `POST /api/localization/`
- `PATCH /api/localization/:key`
- `DELETE /api/localization/:key`

### 4.11 Themes API (`/api/themes`)
- `GET /api/themes/`
- `GET /api/themes/:id`
- `POST /api/themes/`
- `PATCH /api/themes/:id`
- `DELETE /api/themes/:id`

### 4.12 Logs & Dashboard API (`/api/logs`)
- `GET /api/logs/dashboard`
- `GET /api/logs/`
- `GET /api/logs/:id`

### 4.13 Notifications API (`/api/notifications`)
- `GET /api/notifications/stream`
- `GET /api/notifications/`

### 4.14 Files/Assets API (`/api/files`)
- `GET /api/files/image-tree`
- `GET /api/files/card-class-tree`
- `GET /api/files/card-class-source`
- `GET /api/files/character-class-ast-map`
- `POST /api/files/card-class-tsdoc`
- `POST /api/files/card-class-source/save`
- `GET /api/files/uploaded-tree`
- `GET /api/files/atlas-list`
- `DELETE /api/files/atlas`
- `POST /api/files/atlas/export-to-teyvat`
- `POST /api/files/animations/export-to-teyvat`
- `GET /api/files/metadata`
- `POST /api/files/generate-atlas`
- `POST /api/files/generate-animation-atlas`
- `PATCH /api/files/uploaded/rename`
- `DELETE /api/files/uploaded`
- `DELETE /api/files/assets`
- `PATCH /api/files/cards/rename`
- `PATCH /api/files/assets/rename`
- `PATCH /api/files/cards/move`
- `DELETE /api/files/cards`
- `PATCH /api/files/assets/move`
- `PATCH /api/files/uploaded/move`
- `PATCH /api/files/uploaded/to-assets`
- `PATCH /api/files/uploaded/to-cards`
- `POST /api/files/uploaded/convert-webp`
- `POST /api/files/uploaded/resize`
- `POST /api/files/uploaded/stage/convert-webp-lossy`
- `POST /api/files/uploaded/stage/resize`
- `POST /api/files/uploaded/stage/resize-webp-lossy`
- `POST /api/files/uploaded/stage/commit`
- `POST /api/files/uploaded/stage/discard`
- `POST /api/files/generate-all-cards-atlas`
- `POST /api/files/spritesheet-best-grid`
- `POST /api/files/spritesheet-resize-exports`
- `POST /api/files/animation-spritesheet-save`
- `POST /api/files/animation-spritesheet-compose`
- `POST /api/files/upload`

### 4.15 Server Configuration Versions API (`/api/server-configuration-versions`)
- `GET /api/server-configuration-versions/`
- `GET /api/server-configuration-versions/check`
- `GET /api/server-configuration-versions/sync`
- `GET /api/server-configuration-versions/latest`
- `GET /api/server-configuration-versions/compare`
- `GET /api/server-configuration-versions/:id`

### 4.16 AI API (`/api/ai`)
- `POST /api/ai/chat`

### 4.17 Database Management API (`/api/database-management`)
- `POST /api/database-management/scan`
- `POST /api/database-management/apply`

### 4.18 Test API (`/api/test`)
- `GET /api/test/payment-success`

---

## 5) Mô hình phân quyền

- `admin`: toàn quyền, bao gồm database management.
- `moderator`: quản trị dữ liệu vận hành thông thường (users/game data/logs/assets/...).
- `user`: người chơi game client.

Backend dùng `authenticate` + `authorize(...)` tại route level để kiểm soát quyền truy cập.

---

## 6) Yêu cầu phi chức năng hiện trạng

- Runtime backend: Node.js + Express + TypeScript.
- CSDL: MongoDB + Mongoose.
- Logging: Pino + pino-http.
- Validation: Zod.
- Upload/biến đổi ảnh: Multer + Sharp.
- Frontend admin: React + Vite + TypeScript + Tailwind.
- Hỗ trợ serve admin UI trực tiếp từ backend khi bật `SERVE_ADMIN_UI=true`.

---

## 7) Luồng vận hành chính

1. Admin đăng nhập vào `admin-web`.
2. Quản lý user, nội dung game, localization, themes.
3. Quản lý assets và xuất atlas/animation sang game client.
4. Theo dõi logs/dashboard/notifications.
5. Tạo và theo dõi thanh toán (bao gồm PayOS).
6. Đồng bộ và kiểm tra phiên bản cấu hình server.
7. Khi cần, admin thực hiện scan/apply migration DB.

---

## 8) Trạng thái tài liệu

Tài liệu này phản ánh **tính năng đang có trong codebase hiện tại** và phù hợp làm đặc tả tổng hợp final cho giai đoạn bàn giao vận hành.

---

## 9) Trang mô tả bố cục `admin-web/public/assets`

Mục này mô tả cấu trúc thư mục static assets đang được dùng bởi admin web (quản lý nội dung ảnh, animation, badge, card art...).

### 9.1 Cấu trúc chính
- `admin-web/public/assets/images/about/`
  - Chứa ảnh/logo dùng cho trang giới thiệu, tích hợp dịch vụ (ví dụ Google Auth, PayOS).
- `admin-web/public/assets/images/animations/`
  - Chứa sprite/animation effect phục vụ preview, editor và hiệu ứng theo hệ/nguyên tố.
  - Bao gồm cả tệp `.png` truyền thống và `.webp` đã tối ưu.
- `admin-web/public/assets/images/badge/`
  - Chứa badge theo nhóm vũ khí:
  - `bow/`, `catalyst/`, `claymore/`, `polearm/`, `sword/`.
- `admin-web/public/assets/images/cards/`
  - Chứa ảnh card theo loại:
  - `character/`, `coin/`, `bomb/` và các nhóm card khác.
  - Có file mặc định như `empty.webp`.

### 9.2 Quy ước nội dung assets
- Ưu tiên định dạng `.webp` cho ảnh production để giảm dung lượng.
- Tên file theo ngữ nghĩa gameplay (ví dụ tên nhân vật, tên hiệu ứng, tên vũ khí).
- Tách thư mục theo domain nghiệp vụ để admin dễ tìm và thao tác trong `Manager Assets`.
- Các tác vụ đổi tên/di chuyển/chuyển đổi định dạng được thực hiện qua API `/api/files/*`, sau đó có thể export atlas/animation sang game client.

### 9.3 Vai trò trong hệ thống
- Là nguồn tĩnh để admin preview và chỉnh sửa nội dung media.
- Là đầu vào cho pipeline tạo atlas/spritesheet.
- Là đầu ra trung gian trước khi đồng bộ sang dữ liệu game (`TeyvatCard`).
