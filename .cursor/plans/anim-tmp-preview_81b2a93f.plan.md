---
name: anim-tmp-preview
overview: Thêm pipeline backend “preview trong `server/uploads/tmp/` -> commit sang `server/uploads/resize` và `server/uploads/lossy`” cho `AnimationEditModal`, đồng thời tách logic khỏi `server/src/services/filesService.ts` sang các module nhỏ trong thư mục `server/src/services/files/`.
todos:
  - id: backend-preview-service
    content: Tạo `server/src/services/files/animationSpritesheetPreviewService.ts` để compose 192->webp và tạo resize(96/64) + lossy(quality thấp), lưu vào `server/uploads/tmp/{jobId}/...`.
    status: in_progress
  - id: backend-commit
    content: "Trong cùng service hoặc file con: commit job -> đảm bảo `server/uploads/resize` và `server/uploads/lossy` tồn tại, move/copy + tránh ghi đè (suffix -1, -2,...), trả URL final."
    status: pending
  - id: backend-routes-controllers
    content: Thêm handlers & routes trong `server/src/controllers/filesController.ts` và `server/src/routes/files.ts` cho `POST /files/animation-spritesheet-preview` và `POST /files/animation-spritesheet-preview/commit`.
    status: pending
  - id: backend-facade-filesService
    content: Sửa `server/src/services/filesService.ts` để export các hàm facade cho preview/commit và loại bỏ/không còn ghi vào `admin-web/public/assets/images/animations` trong luồng này.
    status: pending
  - id: frontend-api
    content: Sửa `admin-web/src/services/filesService.ts` thêm 2 method preview/commit tương ứng endpoint mới.
    status: pending
  - id: frontend-modal-ui
    content: "Sửa `admin-web/src/components/assets/AnimationEditModal.tsx`: sau khi bấm Lưu -> tạo preview, hiển thị compare (tmp/resize/lossy), sau duyệt -> commit và hiển thị toast/đóng modal."
    status: pending
  - id: verification
    content: "Chạy dev server và kiểm tra luồng end-to-end: tạo preview không ghi vào folder gốc, commit đúng vào `uploads/resize` và `uploads/lossy`, URL hiển thị được trên frontend."
    status: pending
isProject: false
---

## Mục tiêu

- Khi người dùng bấm “Lưu” trong `AnimationEditModal.tsx`, backend sẽ *chỉ tạo preview* (không ghi vào folder gốc).
- Preview được lưu tạm trong `server/uploads/tmp/` và trả URL về frontend để người dùng so sánh.
- Sau khi người dùng duyệt, backend chuyển/copy output sang:
  - `server/uploads/resize/` (bản resized desktop/mobile)
  - `server/uploads/lossy/` (bản lossy desktop/mobile)
- Tách logic xử lý animation spritesheet khỏi `server/src/services/filesService.ts` thành các file con dưới `server/src/services/files/`.

## Luồng đề xuất

```mermaid
flowchart TD
  A[FE: AnimationEditModal click Lưu] --> B[POST /files/animation-spritesheet-preview]
  B --> C[Backend tạo job trong server/uploads/tmp/{jobId}/]
  C --> D[Trả URL: tmp/original + resize + lossy]
  D --> E[FE: hiển thị compare + người dùng duyệt]
  E --> F[POST /files/animation-spritesheet-preview/commit]
  F --> G[Backend đảm bảo folder server/uploads/resize và server/uploads/lossy tồn tại]
  G --> H[Move/Copy từ tmp job -> resize/lossy]
  H --> I[FE nhận URL cuối + đóng modal / hiển thị toast]
```



## Backend thay đổi

1. Tạo module mới (tách khỏi `server/src/services/filesService.ts`):
  - `server/src/services/files/animationSpritesheetPreviewService.ts`
  - Chứa:
    - hàm compose spritesheet (192 frame) -> `webpBuffer`
    - hàm tạo biến thể:
      - `resize`: desktop (96) + mobile (64) (quality cao)
      - `lossy`: desktop (96) + mobile (64) (quality thấp hơn)
    - hàm “commit”: chuyển/copy biến thể đã duyệt từ job folder sang `server/uploads/resize` và `server/uploads/lossy`
2. Thêm API mới trong `server/src/routes/files.ts` + `server/src/controllers/filesController.ts`:
  - `POST /files/animation-spritesheet-preview`
    - Input: `path` (webPath nguồn `/assets/images/animations/...`), `frames` (number[]), `baseName` (string)
    - Output: `jobId` + URLs cho preview:
      - `tmpOriginalUrl`
      - `resizeDesktopUrl`, `resizeMobileUrl`
      - `lossyDesktopUrl`, `lossyMobileUrl`
      - kèm `frameCount` và `sheetSize` nếu cần hiển thị
  - `POST /files/animation-spritesheet-preview/commit`
    - Input: `jobId` (và optional `baseName` nếu muốn)
    - Output: URLs final tại `uploads/resize` và `uploads/lossy`
3. Sửa `server/src/services/filesService.ts` theo hướng “facade”:
  - Export 2 hàm mới mà controller gọi:
    - `composeAnimationSpritesheetPreview(...)`
    - `commitAnimationSpritesheetPreview(jobId)`
  - (Tùy chọn) giữ lại API cũ nhưng không ghi vào `admin-web/public/assets/images/animations/` nữa.
4. Thêm helper xử lý tên file & tạo thư mục:
  - Tạo thư mục nếu chưa tồn tại:
    - `server/uploads/tmp/`
    - `server/uploads/resize/`
    - `server/uploads/lossy/`
  - Tạo job subfolder theo `jobId` (timestamp/uuid) để tránh đè nhau.
  - Output luôn là `.webp` (theo quy ước đã chốt), lấy `baseName` từ input (strip đuôi `.png/.webp`).
  - Khi commit, tránh ghi đè bằng logic suffix `-1, -2, ...` (giống phong cách `saveAnimationSpritesheetFile`).

## Frontend thay đổi

1. Cập nhật `admin-web/src/services/filesService.ts`:
  - Thêm hàm:
    - `composeAnimationSpritesheetPreview(path, frames, baseName)`
    - `commitAnimationSpritesheetPreview(jobId)`
2. Cập nhật `admin-web/src/components/assets/AnimationEditModal.tsx`:
  - Thay `handleSave()`:
    - bước 1 gọi endpoint preview
    - bước 2 hiển thị vùng compare (ít nhất 3 tab: `Original(tmp)`, `Resize`, `Lossy`) với các `img` lấy từ URLs backend
    - nút “Duyệt & lưu” gọi commit endpoint
  - Giữ UI JSON preview/sprites preview hiện tại.
  - Điều chỉnh validate tên file: input chỉ dùng làm `baseName` (strip extension), không còn ảnh hưởng định dạng đầu ra.

## Checklist kỹ thuật

- Đảm bảo URL trả về khớp với static mount:
  - file trong `server/uploads/...` phải trả URL dạng `/uploads/...`.
- Đảm bảo `jobId` xóa/giữ tạm:
  - tối thiểu giữ đến khi commit thành công; sau commit có thể dọn job folder (optional trong commit service).

