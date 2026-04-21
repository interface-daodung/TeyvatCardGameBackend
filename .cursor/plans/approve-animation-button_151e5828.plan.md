---
name: approve-animation-button
overview: Thêm nút “Duyệt animation” ở khu vực preview của Manager Assets, chỉ hiển thị khi đang chọn ảnh trong `/assets/images/animations/*`, và triển khai API copy file sang `TeyvatCard/public/assets/images/animations` với cơ chế xác nhận ghi đè giống Atlas.
todos:
  - id: fe-manager-assets-button
    content: Thêm nút Duyệt animation trong preview panel + luồng confirm overwrite ở ManagerAssets
    status: completed
  - id: fe-files-service-api
    content: Bổ sung filesService method gọi API export animation to Teyvat
    status: completed
  - id: be-route-controller
    content: Thêm route và controller handler cho POST /files/animations/export-to-teyvat
    status: completed
  - id: be-service-copy
    content: Thêm logic service copy animation sang TeyvatCard/public/assets/images/animations có kiểm tra overwrite
    status: completed
  - id: verify-flow
    content: Rà soát flow hiển thị nút, trạng thái loading, và mapping lỗi/confirm giống Atlas
    status: completed
isProject: false
---

# Kế hoạch thêm nút Duyệt Animation

## Mục tiêu
Bổ sung một action duyệt nhanh ngay trong preview panel của trang Manager Assets để copy file animation đã chọn sang `TeyvatCard/public/assets/images/animations`, với UX và hành vi ghi đè đồng bộ với flow duyệt atlas hiện có.

## Phạm vi thay đổi
- Frontend (Manager Assets): thêm nút icon `folder`, tooltip “Duyệt animation”, điều kiện hiển thị theo file đang preview, gọi API và xử lý confirm overwrite.
- Frontend (filesService): thêm method gọi endpoint duyệt animation (lần đầu và lần confirm ghi đè).
- Backend routes/controller/service: thêm endpoint mới để copy file từ `admin-web/public/assets/images/animations` sang `TeyvatCard/public/assets/images/animations` với kiểm tra path an toàn.

## Cách triển khai chi tiết
- Cập nhật [C:\Users\inter\OneDrive\Documents\GitHub\TeyvatCardGameBackend\admin-web\src\pages\ManagerAssets.tsx](C:\Users\inter\OneDrive\Documents\GitHub\TeyvatCardGameBackend\admin-web\src\pages\ManagerAssets.tsx)
  - Thêm state loading + state mở dialog xác nhận ghi đè cho action duyệt animation.
  - Thêm nút icon `faFolder` cạnh nút edit trong header preview panel.
  - Điều kiện hiển thị nút: chỉ khi `selectedPath` là file ảnh thuộc `/assets/images/animations/` và không phải pending upload.
  - Khi click:
    - Gọi service export animation với `confirmOverwrite=false`.
    - Nếu server trả yêu cầu ghi đè, mở `ConfirmDangerDialog` tương tự Atlas flow.
    - Nếu thành công, hiển thị thông báo success nêu rõ file đã copy sang `TeyvatCard/public/assets/images/animations`.

- Cập nhật [C:\Users\inter\OneDrive\Documents\GitHub\TeyvatCardGameBackend\admin-web\src\services\filesService.ts](C:\Users\inter\OneDrive\Documents\GitHub\TeyvatCardGameBackend\admin-web\src\services\filesService.ts)
  - Thêm method mới ví dụ `exportAnimationToTeyvat(webPath, confirmOverwrite)` gọi endpoint `/files/animations/export-to-teyvat`.
  - Chuẩn hóa lỗi giống style hiện tại (để frontend detect trường hợp cần confirm overwrite qua `409 + code`).

- Cập nhật [C:\Users\inter\OneDrive\Documents\GitHub\TeyvatCardGameBackend\server\src\routes\files.ts](C:\Users\inter\OneDrive\Documents\GitHub\TeyvatCardGameBackend\server\src\routes\files.ts)
  - Đăng ký route mới `POST /files/animations/export-to-teyvat`.

- Cập nhật [C:\Users\inter\OneDrive\Documents\GitHub\TeyvatCardGameBackend\server\src\controllers\filesController.ts](C:\Users\inter\OneDrive\Documents\GitHub\TeyvatCardGameBackend\server\src\controllers\filesController.ts)
  - Thêm handler validate payload (`path`, `confirmOverwrite`).
  - Map lỗi service:
    - Trùng tên chưa confirm -> `409` + `code: NEEDS_OVERWRITE_CONFIRM`
    - Path không hợp lệ / file không tồn tại -> `400/404`
    - Lỗi khác -> `500`

- Cập nhật [C:\Users\inter\OneDrive\Documents\GitHub\TeyvatCardGameBackend\server\src\services\filesService.ts](C:\Users\inter\OneDrive\Documents\GitHub\TeyvatCardGameBackend\server\src\services\filesService.ts)
  - Thêm hàm export animation:
    - Chỉ chấp nhận webPath bắt đầu `/assets/images/animations/`.
    - Resolve source path an toàn dưới `admin-web/public/assets/images/animations`.
    - Destination cố định `getTeyvatPublicPath()/assets/images/animations`.
    - Nếu file đích tồn tại và chưa confirm -> trả lỗi `NEEDS_OVERWRITE_CONFIRM`.
    - Nếu confirm -> copy đè.
  - Tái sử dụng helper path/safe basename sẵn có để chống path traversal.

## Kiểm thử dự kiến
- Chọn file trong `/assets/images/animations/` -> thấy nút folder với tooltip “Duyệt animation”.
- Chọn file ngoài animations -> nút không hiển thị.
- Lần duyệt đầu khi file đích chưa có -> copy thành công.
- Lần duyệt khi file đích đã có -> hiện dialog xác nhận ghi đè.
- Chọn “Ghi đè” -> copy đè thành công; chọn “Hủy” -> không thay đổi file đích.
- Thử path không hợp lệ qua API -> trả lỗi phù hợp, không ghi file ngoài thư mục đích.
