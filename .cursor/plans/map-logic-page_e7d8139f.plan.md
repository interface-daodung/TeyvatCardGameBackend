---
name: map-logic-page
overview: Thêm trang quản trị Map logic cho phép tạo lưới theo dài/rộng, test local trên frontend, rồi lưu lookup table vào domain `MapLogic` mới ở backend.
todos:
  - id: define-maplogic-contract
    content: Chốt interface payload MapLogic (name, width, height, grid, lookupTable, status) dùng chung frontend/backend
    status: completed
  - id: build-backend-maplogic-domain
    content: Tạo model + validator + service + controller + route `map-logic` và mount vào server index
    status: completed
  - id: build-frontend-maplogic-page
    content: Tạo `MapLogic.tsx` với form width/height, tạo grid local, test/preview lookup table và save API
    status: completed
  - id: wire-navigation-and-routing
    content: Thêm route trong `App.tsx` và menu item trong `layout/index.tsx`
    status: completed
  - id: verify-end-to-end
    content: Kiểm thử create/test-local/save/load và xử lý lỗi validation
    status: completed
isProject: false
---

# Kế hoạch triển khai trang Map logic

## Mục tiêu

Xây trang mới `Map logic` trong admin để nhập `width/height`, tạo và test lưới ngay tại client, sau đó lưu dữ liệu lookup table vào DB qua domain backend mới `MapLogic`.

## Phạm vi thay đổi

- Frontend: thêm page + route + menu + service API cho MapLogic.
- Backend: thêm model/controller/service/route/validator cho `MapLogic` (CRUD cơ bản phục vụ tạo và lưu).
- Test mode: **frontend-only** (không tạo endpoint `/test`).

## Thiết kế dữ liệu đề xuất

- Tạo `MapLogic` document riêng, chứa:
  - `name` (tên logic)
  - `gridConfig` (`width`, `height`)
  - `lookupTable` (dữ liệu sinh ra từ lưới để tra cứu)
  - `status` (`draft`/`active` nếu cần)
  - timestamps
- Frontend tính lookup table từ trạng thái grid local, gửi payload hoàn chỉnh khi Save.

## Các file chính sẽ cập nhật

- Frontend routes/navigation:
  - [C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/admin-web/src/App.tsx](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/admin-web/src/App.tsx)
  - [C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/admin-web/src/components/layout/index.tsx](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/admin-web/src/components/layout/index.tsx)
- Frontend page/service mới:
  - [C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/admin-web/src/pages/MapLogic.tsx](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/admin-web/src/pages/MapLogic.tsx)
  - [C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/admin-web/src/services/mapLogicService.ts](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/admin-web/src/services/mapLogicService.ts)
- Backend domain mới:
  - [C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/models/MapLogic.ts](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/models/MapLogic.ts)
  - [C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/services/mapLogicService.ts](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/services/mapLogicService.ts)
  - [C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/controllers/mapLogicController.ts](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/controllers/mapLogicController.ts)
  - [C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/routes/mapLogic.ts](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/routes/mapLogic.ts)
  - [C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/validators/gameData.ts](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/validators/gameData.ts)
  - [C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/index.ts](C:/Users/inter/OneDrive/Documents/GitHub/TeyvatCardGameBackend/server/src/index.ts)

## Luồng xử lý dự kiến

```mermaid
flowchart TD
  AdminUser[AdminUser] --> MapLogicPage[MapLogicPage]
  MapLogicPage --> GridBuilder[GridBuilderLocalState]
  GridBuilder --> LookupGenerator[generateLookupTable]
  LookupGenerator --> PreviewPanel[PreviewAndValidation]
  PreviewPanel -->|save| MapLogicServiceFE[mapLogicService]
  MapLogicServiceFE --> ApiRoute[/api/map-logic]
  ApiRoute --> MapLogicController[mapLogicController]
  MapLogicController --> MapLogicServiceBE[mapLogicService]
  MapLogicServiceBE --> MapLogicModel[(MapLogicCollection)]
```



## Chi tiết triển khai

- Dựa pattern hiện có từ `Maps`/`AdventureCards` page để giữ UX đồng nhất (list + create + save flow).
- Trong `MapLogic.tsx`:
  - Form nhập `name`, `width`, `height`.
  - Nút `Generate Grid` để khởi tạo ma trận cell.
  - Vùng tương tác test local (toggle/edit cell hoặc rule cơ bản).
  - Tính `lookupTable` từ grid state và hiển thị preview JSON/tóm tắt.
  - Nút `Save` gọi API `POST /api/map-logic`.
- Ở backend:
  - Thêm schema Zod validate `width/height` dương và giới hạn hợp lý.
  - Controller/service CRUD theo pattern hiện có (`mapController`, `mapService`).
  - Giữ error handling/audit log nhất quán với các route game-data hiện tại.

## Kiểm thử

- Frontend:
  - Tạo grid với nhiều cặp width/height, đảm bảo render đúng.
  - Test local thay đổi cell/rule và xác nhận lookup preview cập nhật đúng.
  - Save thành công và reload thấy record MapLogic.
- Backend:
  - Validate payload lỗi (thiếu field, size âm, lookup invalid).
  - Kiểm tra create/get/list/delete hoạt động, response format chuẩn.

## Rủi ro cần lưu ý

- Lookup table có thể lớn nếu grid quá to: cần limit kích thước (`maxWidth`, `maxHeight`) ngay validator và UI.
- Tránh phụ thuộc thuật toán trong `ExtendedGridSupport.html` trực tiếp; chỉ tham khảo logic cốt lõi và tách hàm sinh lookup rõ ràng để dễ test.

- `maxWidth`, `maxHeight = 6 , 6` 

