---
name: staged-upload-images
overview: Thêm luồng staging ảnh transform (tmp/resize, tmp/lossy) để người dùng duyệt preview trong `UploadedImageEditModal` rồi mới commit sang `uploads/`, đồng thời refactor logic transform sang các module nhỏ dưới folder `server/src/services/files/` để `filesService.ts` gọn hơn.
todos:
  - id: backend-tmp-paths
    content: Thêm helper đường dẫn `uploads/tmp/resize` và `uploads/tmp/lossy` (ensure mkdir recursive).
    status: completed
  - id: backend-stage-transforms
    content: "Tạo các function stage bằng sharp cho: stage resize -> tmp/resize, stage convert webp lossy -> tmp/lossy; trả `previewUrl` + `targetFilename` + `stagedFilename`."
    status: completed
  - id: backend-commit-delete
    content: "Thêm API commit: move staged file sang `uploads/` theo `targetFilename` deterministic; xóa staged file sau commit; thêm endpoint discard (nếu dùng)."
    status: completed
  - id: backend-refactor-fileservice
    content: Refactor đoạn resize/convert ra module nhỏ trong `server/src/services/files/*` để `server/src/services/filesService.ts` gọn hơn; export hàm public mới.
    status: completed
  - id: backend-routes-controller
    content: Cắm handlers và routes mới trong `server/src/controllers/filesController.ts` và `server/src/routes/files.ts` (dưới `/api/files`).
    status: completed
  - id: frontend-service-client
    content: Cập nhật `admin-web/src/services/filesService.ts` thêm client methods gọi API staging/commit.
    status: completed
  - id: frontend-modal-ui
    content: "Sửa `UploadedImageEditModal.tsx`: chuyển convert/resize sang stage, hiển thị lưới preview chờ duyệt và nút commit vào uploads."
    status: completed
  - id: verification-manual
    content: Chạy dev, thử convert/resize nhiều lần, xác nhận preview nằm trong `uploads/tmp/...` và commit tạo file đúng + không ảnh hưởng các nút Atlas/Animation/Spritesheet.
    status: completed
isProject: false
---

## Mục tiêu

- Chỉ thay đổi logic “popup edit ảnh” (modal `UploadedImageEditModal`) cho thao tác Convert WebP (Lossy) và Resize.
- Khi người dùng bấm Convert/Resize: backend tạo ảnh transform vào `server/uploads/tmp/{resize|lossy}/...` và trả URL preview cho FE.
- FE hiển thị các ảnh preview chờ duyệt thành một lưới; người dùng bấm “Lưu vào uploads” để commit preview từ tmp sang `uploads/`.
- Không đụng tới các nút/logic khác (Atlas Builder, Atlas Animation, Animation edit, Spritesheet edit).

## Luồng dữ liệu (backend -> frontend)

```mermaid
flowchart LR
  A[FE: UploadedImageEditModal
Convert/Resize] -->|POST stage| B[Backend filesController]
  B -->|sharp -> write tmp/resize or tmp/lossy| C[tmp/{resize|lossy}]
  B -->|previewUrl + commit info| A
  A -->|POST commit| B
  B -->|rename/move staged file -> uploads/| D[uploads]
  B -->|{ok}| A
  A -->|onSuccess -> refresh tree| E[ManagerAssets]
```



## Quy ước tên file (để deterministic khi commit)

- `tmp/resize`:
  - Target final (khi commit) giữ đúng format hiện tại: `base-${w}x${h}${ext}`.
  - Staged file (preview) thêm marker thời gian: `base-${w}x${h}-stage-${timestamp}${ext}`.
- `tmp/lossy` (webp lossy):
  - Nếu input không phải `.webp`:
    - Target final (deterministic): `${baseNameNoExt}-q${q}.webp`.
    - Staged: `${baseNameNoExt}-q${q}-stage-${timestamp}.webp`.
  - Nếu input là `.webp`:
    - Target final: `${baseNameNoExt}.webp`.
    - Staged: `${baseNameNoExt}-stage-${timestamp}.webp`.
- Sau khi commit hoặc discard: backend xóa file staged trong tmp.

## Thay đổi backend

1. Refactor logic transform
  - Tạo các module nhỏ (vd):
    - `server/src/services/files/paths.ts` (các hàm tính đường dẫn `uploads/tmp/resize`, `uploads/tmp/lossy`)
    - `server/src/services/files/staging.ts` (stage/commit/delete entry points)
    - `server/src/services/files/resize.ts` và `server/src/services/files/convertWebp.ts` (hàm dùng sharp)
  - `server/src/services/filesService.ts` sẽ chỉ export/ủy quyền các hàm public mới, giảm độ dài phần code resize/convert.
2. Thêm API staging/commit (không phá API cũ)
  - Thêm handler mới trong `server/src/controllers/filesController.ts`:
    - `stageConvertToWebpLossyHandler` (POST)
    - `stageResizeUploadedHandler` (POST)
    - `commitStagedPreviewHandler` (POST)
    - `deleteStagedPreviewHandler` (DELETE/POST tùy bạn chọn)
  - Thêm routes tương ứng trong `server/src/routes/files.ts` (dưới `/files/...`).
3. Đảm bảo thư mục tmp sẵn sàng
  - Khi stage, backend `mkdirSync(..., { recursive:true })` cho:
    - `uploads/tmp`
    - `uploads/tmp/resize`
    - `uploads/tmp/lossy`
4. Serve preview ảnh
  - Vì tmp nằm trong `server/uploads/...` nên FE xem ảnh qua URL `/uploads/tmp/...` nhờ middleware tĩnh có sẵn (`app.use('/uploads', express.static(...))`).

## Thay đổi frontend

1. Cập nhật `admin-web/src/services/filesService.ts`
  - Thêm các hàm gọi API mới:
    - `stageConvertToWebpLossy(filename, quality)`
    - `stageResizeUploaded(filename, width, height)`
    - `commitStagedPreview({ stagedFilename, kind })`
    - (tùy chọn) `deleteStagedPreview({ stagedFilename, kind })`
2. Sửa `admin-web/src/components/assets/UploadedImageEditModal.tsx`
  - Giữ nguyên rename/delete.
  - Thay `handleConvertWebp` và `handleResize`:
    - Không gọi `convertToWebp`/`resizeUploaded` cũ nữa.
    - Gọi API `stage*` và push kết quả vào state `pendingPreviews[]`.
  - Thêm UI “Chờ duyệt” dưới phần resize/convert:
    - Render grid các cards preview (ảnh + thông tin params + nút `Lưu vào uploads`).
    - Khi click `Lưu`: gọi `commitStagedPreview`, sau đó `onSuccess()` để refresh tree và remove item khỏi `pendingPreviews`.
    - Có thể có nút xóa preview (discard) để người dùng tự dọn.

## Kiểm soát phạm vi

- Không sửa các component/luồng liên quan `Atlas Builder`, `Atlas Animation`, `Animation edit`, `Spritesheet edit` (chỉ đảm bảo các file import/props của modal không ảnh hưởng).

## Những file nhiều khả năng thay đổi

- Backend:
  - `server/src/services/filesService.ts`
  - `server/src/controllers/filesController.ts`
  - `server/src/routes/files.ts`
  - Thêm folder/module mới: `server/src/services/files/*`
- Frontend:
  - `admin-web/src/services/filesService.ts`
  - `admin-web/src/components/assets/UploadedImageEditModal.tsx`

## Test thủ công đề xuất

- Upload 1 ảnh png/jpg vào `uploaded`.
- Mở modal edit ảnh -> bấm resize preset và convert lossy nhiều lần -> các preview xuất hiện trong lưới “Chờ duyệt”.
- Bấm `Lưu vào uploads` -> file mới xuất hiện ở cây `uploaded`, tmp preview bị xóa.
- Thử commit khi trùng target (cùng params) -> xác nhận server trả error hợp lý (không ghi đè uploads).

