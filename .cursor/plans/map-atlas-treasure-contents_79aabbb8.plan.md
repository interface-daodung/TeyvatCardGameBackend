---
name: map-atlas-treasure-contents
overview: Mở rộng logic tạo atlas trong form map để khi deck có thẻ treasure thì tự động bổ sung ảnh từ contents của rương (1 cấp), đồng thời vẫn giữ ảnh của thẻ rương trong atlas.
todos:
  - id: inspect-map-modal
    content: Refactor deckAtlasImages useMemo trong MapFormModal để thêm xử lý contents của treasure.
    status: completed
  - id: dedupe-and-compat
    content: Đảm bảo dedupe theo path và tương thích cả contents dạng string[] hoặc object[] khi đọc dữ liệu.
    status: completed
  - id: validate-atlas-input
    content: Kiểm tra dữ liệu truyền vào AtlasBuilderModal và hành vi disable của nút tạo atlas sau khi mở rộng logic.
    status: completed
isProject: false
---

# Mở rộng atlas map cho treasure contents

## Mục tiêu
Khi bấm `Tạo atlas` trong modal map, danh sách ảnh truyền vào `AtlasBuilderModal` sẽ bao gồm:
- Ảnh các thẻ đang có trong `deckIds` (logic hiện tại, giữ nguyên).
- Ảnh các thẻ nằm trong `contents` của các thẻ có `type === 'treasure'` trong deck (chỉ 1 cấp).
- Khử trùng lặp theo `path` để không thêm ảnh trùng.

## Phạm vi thay đổi
- Cập nhật tính toán `deckAtlasImages` trong [`C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/admin-web/src/components/maps/MapFormModal.tsx`](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/admin-web/src/components/maps/MapFormModal.tsx).
- Tận dụng các util/type sẵn có:
  - `getCardImageUrl` từ `mapUtils`.
  - `AdventureCard.contents` từ `gameDataService`.

## Cách triển khai
- Refactor `useMemo deckAtlasImages` để:
  - Tạo map tra cứu nhanh `cardById` từ `adventureCards`.
  - Duyệt `form.deckIds`, thêm ảnh thẻ deck như hiện tại.
  - Nếu thẻ là `treasure`, chuẩn hóa `contents` về danh sách ID (hỗ trợ cả `string[]` và populated object nếu có), rồi thêm ảnh cho từng thẻ con tìm thấy trong `adventureCards`.
  - Dùng một helper nội bộ `addImage(card, fallbackName)` để gom logic `path/name` + dedupe.
- Giữ nguyên các props của `AtlasBuilderModal` (`images`, `initialSelectedPaths`) vì chúng đã dùng trực tiếp từ `deckAtlasImages`.

## Kiểm thử dự kiến
- Trường hợp thường: deck không có `treasure` -> danh sách atlas không đổi.
- Deck có `treasure` với `contents` hợp lệ -> atlas thêm đúng ảnh thẻ trong rương.
- `contents` chứa ID không tồn tại -> bỏ qua an toàn, không crash.
- Trùng ảnh giữa deck và contents -> atlas chỉ giữ 1 entry theo `path`.
- Nút `Tạo atlas` vẫn disabled khi không có ảnh hợp lệ.
