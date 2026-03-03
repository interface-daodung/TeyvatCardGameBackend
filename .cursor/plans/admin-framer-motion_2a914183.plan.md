---
name: admin-framer-motion
overview: Standardize Framer Motion animations across admin-web pages and shared components using consistent presets for text, cards, lists, modals, and popups.
todos:
  - id: define-presets
    content: Tạo motionPresets.ts với các variant chuẩn (fadeInText, fadeInCard, slideUpItem, fadeSlideCard, scaleInModal, zoomInPopup) và helper stagger nếu cần.
    status: completed
  - id: update-pageheader-layout
    content: Cập nhật PageHeader, Sidebar, AppHeader, NotificationDropdown để dùng preset Framer Motion chung.
    status: completed
  - id: update-list-items
    content: Áp dụng slideUpItem cho UserRow và các list row khác.
    status: completed
  - id: update-modals
    content: Áp dụng scaleInModal cho AdventureCardCreateModal, AdventureCardEditModal, UploadedImageEditModal và các modal inline trong pages.
    status: completed
  - id: update-pages
    content: Đi lần lượt qua tất cả pages trong admin-web/src/pages để áp dụng animation chuẩn cho PageHeader, Card UI, list items.
    status: completed
  - id: lint-and-polish
    content: Chạy lint + kiểm tra nhanh UX trên Dashboard, Users, Login, AdventureCards sau khi thêm animation.
    status: completed
isProject: false
---

# Chuẩn hóa Framer Motion cho admin-web

### Mục tiêu

- **Áp dụng chuẩn animation**: 
  - **Fade in** cho text, `PageHeader`, và các thẻ card thông tin đơn giản.
  - **Slide up** cho từng list item (hàng trong danh sách, row component).
  - **Scale in** cho toàn bộ modal (khung nội dung chính), kèm overlay fade nếu phù hợp.
  - **Fade + Slide** cho các khối Card UI lớn (filter card, thống kê, container chính trong page).
  - **Zoom in** cho popup nhỏ (ví dụ dropdown thông báo, popover dạng nổi).
- **Tái sử dụng được**: gom các `motion` variant vào 1 file chung và dùng lại trên tất cả pages/components.
- **Giữ UX mượt**: dùng duration, easing và delay hợp lý, tránh over-animate (chỉ on-mount, không loop).

### Các file chính sẽ chỉnh

- **File preset animation mới** (tạo mới):
  - `[admin-web/src/components/animations/motionPresets.ts](admin-web/src/components/animations/motionPresets.ts)`.
- **Layout & header**:
  - `[admin-web/src/components/PageHeader.tsx](admin-web/src/components/PageHeader.tsx)` – thêm fade-in cho text header.
  - `[admin-web/src/components/layout/Sidebar.tsx](admin-web/src/components/layout/Sidebar.tsx)` – đảm bảo list nav dùng slide-up preset thay vì hard-code.
  - `[admin-web/src/components/layout/AppHeader.tsx](admin-web/src/components/layout/AppHeader.tsx)` – tinh chỉnh header fade/slide nếu cần cho đúng preset.
  - `[admin-web/src/components/layout/NotificationDropdown.tsx](admin-web/src/components/layout/NotificationDropdown.tsx)` – chuyển sang dùng zoom-in preset cho popup và slide/fade cho từng notification item.
- **List item components (Slide up)** – ví dụ:
  - `[admin-web/src/components/users/UserRow.tsx](admin-web/src/components/users/UserRow.tsx)`.
  - (Các row/card item khác nếu tìm thấy: characters, maps, logs, payments, equipment, v.v. sẽ áp dụng cùng preset.)
- **Modal components (Scale in)**:
  - `[admin-web/src/components/adventureCards/AdventureCardCreateModal.tsx](admin-web/src/components/adventureCards/AdventureCardCreateModal.tsx)`.
  - `[admin-web/src/components/adventureCards/AdventureCardEditModal.tsx](admin-web/src/components/adventureCards/AdventureCardEditModal.tsx)`.
  - `[admin-web/src/components/assets/UploadedImageEditModal.tsx](admin-web/src/components/assets/UploadedImageEditModal.tsx)`.
  - Bất kỳ modal inline trong pages như `[admin-web/src/pages/Maps.tsx](admin-web/src/pages/Maps.tsx)`, `[admin-web/src/pages/Themes.tsx](admin-web/src/pages/Themes.tsx)`, `[admin-web/src/pages/Localization.tsx](admin-web/src/pages/Localization.tsx)` sẽ được bọc bằng preset Scale in.
- **Pages trong `admin-web/src/pages`** (áp dụng PageHeader + Card UI + list item chuẩn):
  - `[admin-web/src/pages/Dashboard.tsx](admin-web/src/pages/Dashboard.tsx)` – đã dùng `motion`, sẽ refactor dùng preset (Fade+Slide cho card, Fade cho text).
  - `[admin-web/src/pages/Users.tsx](admin-web/src/pages/Users.tsx)` – thêm fade-in cho header/filter card, slide-up cho list items.
  - `[admin-web/src/pages/Login.tsx](admin-web/src/pages/Login.tsx)` – thêm fade-in cho logo/text, fade+slide cho login card.
  - Các page còn lại: `Characters.tsx`, `CharacterDetail.tsx`, `AdventureCards.tsx`, `Maps.tsx`, `Equipment.tsx`, `Payments.tsx`, `CreatePaymentLink.tsx`, `Logs.tsx`, `ManagerAssets.tsx`, `Localization.tsx`, `ServerConfigurationVersions.tsx`, `Themes.tsx`, `About.tsx`, v.v. đều sẽ được áp dụng theo cùng tiêu chuẩn (PageHeader fade-in, Card UI fade+slide, list rows slide-up, modals scale-in nếu có).

### Thiết kế preset Framer Motion

- **Tạo file preset chung** `motionPresets.ts` với các variant đặt tên rõ ràng, ví dụ:
  - `fadeInText`: `{ hidden: { opacity: 0 }, visible: { opacity: 1 } }` với `transition: { duration: 0.3, ease: 'easeOut' }` – dùng cho text, `PageHeader`.
  - `fadeInCard`: `{ hidden: { opacity: 0 }, visible: { opacity: 1 } }` với duration hơi dài hơn (0.35–0.4) – dùng cho card đơn.
  - `slideUpItem`: `{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }` – dùng cho list item (`UserRow`, row logs, item trong danh sách).
  - `fadeSlideCard`: `{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }` – dùng cho Card UI khối lớn (filter box, stat card, sections trong Dashboard).
  - `scaleInModal`: `{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }` – dùng cho khung modal (Card chính), overlay có thể chỉ fade.
  - `zoomInPopup`: `{ hidden: { opacity: 0, scale: 0.9, y: -4 }, visible: { opacity: 1, scale: 1, y: 0 } }` – dùng cho popup/dropdown nhỏ như `NotificationDropdown`.
- Export helper nhỏ (tuỳ chọn) như `withStagger` cho list (`custom` index, `delay: index * 0.05`) để các item vào lần lượt.

### Cách áp dụng trên components & pages

- **1. Áp dụng Fade in cho PageHeader và text chính**
  - Cập nhật `[admin-web/src/components/PageHeader.tsx](admin-web/src/components/PageHeader.tsx)` để:
    - Import `motion` và `fadeInText` từ `motionPresets`.
    - Bao `h1` và `description` trong `motion.div` dùng `variants={fadeInText}`, `initial="hidden"`, `animate="visible"`.
  - Trong `Dashboard.tsx` và các page khác, bỏ bớt `motion.div` bao quanh `PageHeader` (nếu trùng), chỉ giữ animation tại `PageHeader` để không double-animate.
- **2. Áp dụng Fade + Slide cho Card UI**
  - Trong `Dashboard.tsx`, thay thế cấu hình `initial/animate` hard-code cho các stat cards, server snapshot card, và chart container bằng `variants={fadeSlideCard}` + `custom` index để delay.
  - Ở các page khác, mọi `Card` lớn (filter form, info panel, section card) sẽ được bọc bằng `motion.div` dùng `fadeSlideCard` hoặc `fadeInCard` tùy ý (Card UI – dùng `fadeSlideCard`).
- **3. Áp dụng Slide up cho list items**
  - Cập nhật `[admin-web/src/components/users/UserRow.tsx](admin-web/src/components/users/UserRow.tsx)`:
    - Import `motion` + `slideUpItem`.
    - Bọc root (Link) bằng `motion(Link)` hoặc bọc thêm 1 `motion.div` bên trong, dùng `variants={slideUpItem}`; cho phép nhận `index` từ parent nếu cần stagger.
  - Các list row khác (nếu có component riêng cho character row, log row, payment row, v.v.) cũng dùng cùng preset.
  - Ở các page danh sách (Users, Characters, AdventureCards, Logs, Payments, Equipment, Maps, ManagerAssets, Localization...), nếu cần stagger, truyền `index` vào row.
- **4. Áp dụng Scale in cho modal**
  - Trong `AdventureCardCreateModal`, `AdventureCardEditModal`, `UploadedImageEditModal`:
    - Import `motion` + `scaleInModal`.
    - Phần overlay (`div` nền đen) dùng fade đơn giản (opacity 0 → 1) hoặc `fadeInCard`.
    - Khung modal chính (`div` chứa Card) bọc bằng `motion.div` với `variants={scaleInModal}`.
  - Các modal khai báo inline trong `Maps.tsx`, `Themes.tsx`, `Localization.tsx` (nếu đang chỉ là `div fixed`/`Card`) cũng bọc tương tự.
- **5. Áp dụng Zoom in cho popup (Notification dropdown)**
  - Trong `[admin-web/src/components/layout/NotificationDropdown.tsx](admin-web/src/components/layout/NotificationDropdown.tsx)`:
    - Dùng `zoomInPopup` cho `motion.div` dropdown.
    - Các notification item bên trong vẫn có thể dùng `slideUpItem` + stagger để phù hợp chuẩn list item.
- **6. Dọn dẹp & đồng bộ**
  - Gỡ bỏ các cấu hình `initial/animate/transition` lẻ tẻ trùng nghĩa hiện đang hard-code (Dashboard, Sidebar, AppHeader, NotificationDropdown) và thay bằng dùng shared presets để dễ bảo trì.
  - Đảm bảo mọi animation chỉ chạy on-mount (không gây flicker khi state nhỏ thay đổi) – dùng `key` hợp lý hoặc chỉ áp dụng ở wrapper ngoài.
  - Chạy `npm run lint` cho `admin-web` và sửa các lỗi linter (nếu có) liên quan tới import không dùng, kiểu của `motion(Link)`, v.v.

### Todo chính

- **define-presets**: Tạo `motionPresets.ts` với đầy đủ variant (fadeInText, fadeInCard, slideUpItem, fadeSlideCard, scaleInModal, zoomInPopup) và helper stagger.
- **update-pageheader-layout**: Cập nhật `PageHeader`, `Sidebar`, `AppHeader`, `NotificationDropdown` dùng preset chung.
- **update-list-items**: Áp dụng `slideUpItem` cho `UserRow` và các row component khác.
- **update-modals**: Áp dụng `scaleInModal` cho tất cả modal (AdventureCard modals, UploadedImageEditModal, modals inline trong pages).
- **update-pages**: Lần lượt chỉnh tất cả file trong `admin-web/src/pages` để dùng `PageHeader` fade-in + Card UI fade+slide + list item slide-up.
- **lint-and-polish**: Chạy lint, fix lỗi nhỏ, kiểm tra nhanh UX trên vài page chính (Dashboard, Users, Login, AdventureCards).

