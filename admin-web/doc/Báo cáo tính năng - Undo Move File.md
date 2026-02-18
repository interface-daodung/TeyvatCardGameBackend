# Báo cáo tính năng: Nút Quay lại (Undo) cho Move File

Tài liệu mô tả tính năng **Quay lại** sau khi di chuyển file trong trang Manager Assets. **Tính năng chưa được triển khai**, chỉ dùng làm báo cáo/đặc tả.

---

## 1. Tổng quan

- **Trang liên quan:** `admin-web/src/pages/ManagerAssets.tsx`
- **Ngữ cảnh:** Người dùng có thể kéo thả file giữa các thư mục (cards / uploaded). Sau khi move thành công, hiện không có cách nào hoàn tác (undo) nếu move nhầm.
- **Mục tiêu:** Thêm nút **Quay lại** để hoàn tác **một lần** move file gần nhất (đưa file về đúng thư mục cũ).

---

## 2. Phạm vi tính năng

| Nội dung | Mô tả |
|----------|--------|
| Hành vi | Sau mỗi lần move file thành công, lưu thông tin “từ đâu → đến đâu”. Nút “Quay lại” gọi API move ngược (từ vị trí mới về thư mục cũ). |
| Số bước undo | Chỉ **1 bước** (lần move cuối cùng). Không yêu cầu undo nhiều bước hay redo. |
| Vị trí UI | Nút đặt trong khu vực File tree (CardContent), gần thông báo lỗi/loading của move (ví dụ: chỉ hiện khi có “lần move gần nhất” và không đang loading). |

---

## 3. Cách triển khai dự kiến (chưa làm)

- **State:** Thêm `lastMove: { fromPath: string; newPath: string } | null`. Sau mỗi lần `handleMoveFile` thành công, set `lastMove` từ `droppedFilePath` và `res.imageUrl` (hoặc đường dẫn mới tương đương).
- **Undo:** Hàm `handleUndoMove`: nếu có `lastMove`, gọi API move để chuyển file từ `lastMove.newPath` về thư mục `dirname(lastMove.fromPath)` (dùng lại logic phân nhánh card/uploaded như trong `handleMoveFile`). Sau khi undo thành công: `fetchTrees()`, cập nhật `selectedPath` nếu cần, và `setLastMove(null)`.
- **UI:** Một nút (ví dụ “Quay lại” hoặc “Undo”) chỉ hiện khi `lastMove !== null` và không đang trong trạng thái move/undo loading; click → gọi `handleUndoMove`.

---

## 4. Trạng thái

| Mục | Trạng thái |
|-----|------------|
| Đặc tả / báo cáo | ✅ Có (file này) |
| Triển khai code | ❌ Chưa làm |

---

*Tài liệu chỉ dùng cho báo cáo tính năng; khi triển khai có thể cập nhật lại file này.*
