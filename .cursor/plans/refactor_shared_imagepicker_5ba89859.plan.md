---
name: Refactor Shared ImagePicker
overview: Đánh giá cho thấy có thể tách phần chọn ảnh dùng chung giữa Adventure/Equipment và tái dùng một phần trong Character. Kế hoạch ưu tiên tách phần overlay + tương tác chung trước, giữ nguyên logic spritesheet animated để giảm rủi ro.
todos:
  - id: extract-base-surface
    content: Tạo `ImagePickerSurface` (và nếu cần `FileTreePickerOverlay`) để gom overlay + trigger + lightbox tĩnh
    status: pending
  - id: migrate-adventure-equipment
    content: Chuyển `AdventureCardImagePicker` và `EquipmentItemImagePicker` sang dùng component chung, giữ UI riêng qua props/render slot
    status: pending
  - id: optional-character-phase2
    content: Tái dùng component chung cho tab `default/unlock` của `CharacterDetailImage`, giữ nguyên tab `animated`
    status: pending
  - id: verify-regression
    content: Kiểm tra thủ công toàn bộ luồng mở picker, chọn ảnh, lightbox và keyboard interaction
    status: pending
isProject: false
---

# Tách ImagePicker dùng chung

## Mục tiêu
- Giảm lặp code ở picker ảnh trong:
  - [admin-web/src/components/adventureCards/AdventureCardImagePicker.tsx](admin-web/src/components/adventureCards/AdventureCardImagePicker.tsx)
  - [admin-web/src/components/equipment/EquipmentItemImagePicker.tsx](admin-web/src/components/equipment/EquipmentItemImagePicker.tsx)
  - [admin-web/src/components/characters/CharacterDetailImage.tsx](admin-web/src/components/characters/CharacterDetailImage.tsx)
- Giữ nguyên hành vi hiện tại: `Ctrl/Cmd + click` mở picker, `double-click` mở lightbox, hỗ trợ keyboard.
- Không đụng sâu vào tab `animated` của Character ở pha đầu.

## Kết luận khả năng tách
- **Tách được** phần dùng chung sau:
  - Khung overlay file tree (`Chọn ảnh` + `Đóng` + loading/empty + render `FileTreeNode`).
  - Tương tác trigger (`Ctrl/Cmd + click`, keyboard `Ctrl/Cmd + Enter/Space`).
  - Luồng lightbox ảnh tĩnh.
- **Không nên gộp hoàn toàn** `CharacterDetailImage` vì tab `animated` có canvas/timer/custom lightbox riêng.

## Thiết kế đề xuất
- Tạo base component mới: [admin-web/src/components/ui/ImagePickerSurface.tsx](admin-web/src/components/ui/ImagePickerSurface.tsx)
  - Nhận props controlled cho tree (`open`, `tree`, `loading`, `expanded`, callback toggle/select/close).
  - Nhận dữ liệu preview (`src`, `alt`) và cấu hình giao diện (`aspectRatio`, className, emptyState).
  - Tích hợp trigger chuẩn và lightbox tĩnh tùy chọn.
- Tuỳ chọn tách nhỏ tiếp: [admin-web/src/components/ui/FileTreePickerOverlay.tsx](admin-web/src/components/ui/FileTreePickerOverlay.tsx)
  - Dùng lại cho các nơi khác như map/equipment create sau này.

## Phạm vi migrate (an toàn)
1. Refactor [admin-web/src/components/adventureCards/AdventureCardImagePicker.tsx](admin-web/src/components/adventureCards/AdventureCardImagePicker.tsx) sang base mới.
2. Refactor [admin-web/src/components/equipment/EquipmentItemImagePicker.tsx](admin-web/src/components/equipment/EquipmentItemImagePicker.tsx) sang base mới (giữ placeholder riêng + `smallAssetLightbox`).
3. Trong [admin-web/src/components/characters/CharacterDetailImage.tsx](admin-web/src/components/characters/CharacterDetailImage.tsx):
   - Chỉ thay phần `default` và `unlock` bằng base (nếu muốn pha 2).
   - Giữ nguyên block `animated` để tránh regression.

## Rủi ro và kiểm tra
- Rủi ro chính: lệch UX trigger và focus keyboard giữa các màn.
- Cần test thủ công tối thiểu:
  - Mở/đóng tree picker ở cả 3 màn.
  - Chọn file cập nhật đúng field.
  - Double-click mở lightbox đúng ảnh.
  - Fallback ảnh lỗi vẫn hoạt động.
  - Character tab `animated` hoạt động y như cũ.