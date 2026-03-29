---
name: Equipment Drawer Edit UX
overview: Chuyển form chỉnh sửa equipment từ modal full-screen sang panel Drawer bên phải, kết hợp vùng lưới một hàng với thẻ scale 50% để vẫn bấm được item khác; gộp panel i18n vào trong Drawer để bỏ layout hai cột; bổ sung luồng “chuyển item” khi dirty giống đóng drawer.
todos:
  - id: hook-pending-switch
    content: "useEquipment: pendingEditItem + requestOpenEditModal; unsaved flow cho discard/save/stay khi chuyển item"
    status: completed
  - id: page-split-layout
    content: "Equipment.tsx: flex split, 1 hàng lưới scale-50 + highlight selected; gọi requestOpenEditModal"
    status: completed
  - id: edit-drawer-ui
    content: Refactor EquipmentEditModal thành panel phải; i18n panel stack trong drawer, bỏ hai cột ngang
    status: completed
isProject: false
---

# Equipment: Drawer thay popup + lưới 1 hàng scale 50%

## Bối cảnh hiện tại

- `[admin-web/src/pages/Equipment.tsx](admin-web/src/pages/Equipment.tsx)`: lưới responsive nhiều cột; khi mở edit, `[EquipmentEditModal](admin-web/src/components/equipment/EquipmentEditModal.tsx)` portal full màn + overlay (`fixed inset-0 z-50`), che toàn bộ lưới.
- `[EquipmentEditModal.tsx](admin-web/src/components/equipment/EquipmentEditModal.tsx)`: khi `i18nPopupField` có giá trị, `[EquipmentI18nPanel](admin-web/src/components/equipment/EquipmentI18nPanel.tsx)` render **cạnh** form như cột thứ hai — tạo cảm giác hai lớp UI chồng nhau.
- `[useEquipment.ts](admin-web/src/components/equipment/useEquipment.ts)`: `openEditModal` gán state trực tiếp, **không** kiểm tra dirty khi chọn item khác.

## Hướng triển khai

### 1. Layout trang khi đang edit (`Equipment.tsx`)

- Bọc phần không phải header (và có thể cả error) trong một `flex` ngang khi `eq.editModalOpen` (có thể đổi tên state thành `editOpen` / giữ nguyên tên để giảm diff trong hook — tùy chọn).
- **Cột trái (lưới):** luôn **một hàng**: `flex flex-nowrap overflow-x-auto`, gap nhỏ; mỗi ô bọc thẻ trong wrapper `transform scale-50 origin-top-left` (hoặc `scale-[0.5]` + `origin-top-left`) và điều chỉnh kích thước wrapper để layout không vỡ (pattern: khung cố định chiều cao ~ một nửa chiều cao thẻ gốc, `overflow-x-auto`; có thể dùng `w-[...]` / negative margin phụ thuộc kích thước `EquipmentItemCard` thực tế sau khi scale).
- **Cột phải:** panel Drawer cố định chiều cao viewport (trừ padding page): `border-l`, `bg-card`, `shadow`, `overflow-y-auto`, chiều rộng hợp lý (ví dụ `w-full max-w-xl` hoặc `min(50vw, …)` — chỉnh sau khi nhìn UI).
- **Không** dùng overlay full màn che lưới; có thể bỏ nền mờ hoặc chỉ mờ phần không dùng nếu vẫn muốn tách tầng (ưu tiên: lưới trái vẫn click được như yêu cầu).
- Highlight item đang edit (ví dụ `ring-2` / border) dựa trên `eq.selectedItem?.nameId`.

### 2. Refactor `EquipmentEditModal` → nội dung Drawer

- Tách phần “nội dung form” khỏi `fixed inset-0` + overlay + `createPortal` — render **inline** trong cột phải của `Equipment.tsx` (hoặc component mới `EquipmentEditDrawer` import cùng props để tránh file quá dài).
- Giữ animation phù hợp (ví dụ `motion` slide-in từ phải cho panel) thay cho `scaleInModal` centered.
- **Gộp i18n:** khi `i18nPopupField` mở, render `EquipmentI18nPanel` **bên dưới** block thông tin chính trong cùng panel (cùng cột, scroll chung), **không** còn layout hai cột ngang. Có thể giữ header/ nút đóng của `EquipmentI18nPanel` hoặc rút gọn thành section “Sửa i18n” để tránh hai thanh tiêu đề lớn — tối thiểu: bỏ cảm giác “popup thứ hai” (một khối liền trong Drawer).
- `UnsavedChangesDialog` giữ nguyên (dialog xác nhận là chấp nhận được; không phải nested edit popup).

### 3. Chuyển item khi có thay đổi chưa lưu (`useEquipment.ts`)

- Thêm state kiểu `pendingEditItem: GameItem | null` (hoặc tương đương).
- Thay chỗ gọi `onClick={() => eq.openEditModal(item)}` bằnhành vi mới, ví dụ `requestOpenEditModal(item)`:
  - Nếu không dirty hoặc không đang mở edit: gọi `openEditModal(item)` như hiện tại.
  - Nếu dirty: set `pendingEditItem = item`, `showUnsavedConfirm = true` (giống `requestCloseEditModal`).
- Cập nhật handlers:
  - **Ở lại (`dismissUnsavedConfirm`):** xóa `pendingEditItem`.
  - **Hủy (`confirmDiscardEditModal`):** nếu có `pendingEditItem` thì sau khi discard form, `openEditModal(pendingEditItem)` và clear pending; nếu không thì `closeEditModal()` như hiện tại.
  - **Lưu (`confirmSaveEditModal` / sau `handleSave` thành công):** nếu có `pendingEditItem`, sau khi lưu xong mở item đó thay vì đóng hẳn; nếu flow “đóng” không có pending thì giữ hành vi cũ.

Cần chỉnh `handleSave` / `confirmSaveEditModal` để sau save thành công có nhánh: `pendingEditItem ? openEditModal(pendingEditItem) : closeEditModal()` và clear pending.

### 4. Modal “Thêm item”

- Giữ `[EquipmentCreateModal](admin-web/src/components/equipment/EquipmentCreateModal.tsx)` như cũ (popup) trừ khi bạn muốn đồng bộ sau — không nằm trong phạm vi yêu cầu.

## Rủi ro / kiểm tra

- **Scale 0.5:** kiểm tra hit-area và scroll ngang trên thẻ nhỏ; đảm bảo `EquipmentItemCard` vẫn bấm được.
- **Chiều cao:** strip một hàng + Drawer không làm tràn mobile — nếu cần, thêm breakpoint (Drawer full width dưới strip trên màn nhỏ).

## Tệp dự kiến chạm vào

- `[admin-web/src/pages/Equipment.tsx](admin-web/src/pages/Equipment.tsx)` — layout split + mini grid + wiring `requestOpenEditModal`.
- `[admin-web/src/components/equipment/EquipmentEditModal.tsx](admin-web/src/components/equipment/EquipmentEditModal.tsx)` (hoặc file drawer mới) — bỏ portal/overlay centered; i18n stack vertical.
- `[admin-web/src/components/equipment/useEquipment.ts](admin-web/src/components/equipment/useEquipment.ts)` — `pendingEditItem`, `requestOpenEditModal`, cập nhật discard/save/stay.

