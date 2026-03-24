---
name: remove-legacy-equipment
overview: Loại bỏ hoàn toàn backend legacy `Equipment` và cleanup mọi chỗ gọi API `/equipment`, đồng thời giữ nguyên UI trang Equipment hiện tại (vì page đang dùng Item).
todos:
  - id: remove-server-equipment-stack
    content: Xóa model/route/controller/service Equipment và bỏ mount /api/equipment
    status: completed
  - id: cleanup-user-schema-and-services
    content: Gỡ ownedEquipment/bannedCards.equipment cùng logic populate/ban-card equipment
    status: completed
  - id: cleanup-admin-equipment-api-calls
    content: Xóa các method /equipment trong gameDataService và sửa lỗi typing/import liên quan
    status: completed
  - id: cleanup-seed-docs-and-verify
    content: Cập nhật seed/README, chạy kiểm tra build + quét tham chiếu Equipment còn sót
    status: completed
isProject: false
---

# Loại bỏ legacy Equipment hoàn toàn

## Mục tiêu

- Gỡ model/API `Equipment` cũ khỏi server.
- Cleanup mọi chỗ còn gọi `/equipment` trong admin-web service.
- Giữ nguyên UX của trang `Equipment` hiện tại (page đang dựa trên Item), không đổi flow UI chính.
- Loại bỏ tham chiếu `Equipment` trong `User` schema/service để tránh phụ thuộc model đã xóa.

## Phạm vi thay đổi

- **Server API & model**
  - Xóa route mount và import `equipmentRoutes` trong [server/src/index.ts](server/src/index.ts).
  - Xóa module route/controller/service/model legacy:
    - [server/src/routes/equipment.ts](server/src/routes/equipment.ts)
    - [server/src/controllers/equipmentController.ts](server/src/controllers/equipmentController.ts)
    - [server/src/services/equipmentService.ts](server/src/services/equipmentService.ts)
    - [server/src/models/Equipment.ts](server/src/models/Equipment.ts)
  - Gỡ validator liên quan equipment trong [server/src/validators/gameData.ts](server/src/validators/gameData.ts) (`createEquipmentSchema`, `updateEquipmentSchema`).
- **Liên kết User với Equipment**
  - Gỡ field `ownedEquipment` và `bannedCards.equipment` trong [server/src/models/User.ts](server/src/models/User.ts).
  - Gỡ populate và logic xử lý `cardType: 'equipment'` trong [server/src/services/userService.ts](server/src/services/userService.ts).
  - Điều chỉnh enum validator `banCardSchema` trong [server/src/validators/users.ts](server/src/validators/users.ts) để chỉ còn `character`.
- **Admin-web cleanup API Equipment**
  - Xóa interface/type và các method `/equipment` trong [admin-web/src/services/gameDataService.ts](admin-web/src/services/gameDataService.ts).
  - Dọn các import/typing phụ thuộc còn lại ở phía admin-web nếu phát sinh lỗi compile sau khi gỡ service.
- **Seed & tài liệu**
  - Xóa seeding collection `Equipment` trong [server/src/scripts/seed.ts](server/src/scripts/seed.ts).
  - Cập nhật mô tả endpoint trong [server/README.md](server/README.md) (gỡ `/api/equipment`).

## Dữ liệu DB

- Chuẩn bị script migration nhẹ (hoặc thao tác Mongo) để unset field cũ trên `users` documents:
  - `$unset: { ownedEquipment: "", "bannedCards.equipment": "" }`
- Không cần migrate sang collection khác vì bạn xác nhận API/Model Equipment đã ngừng dùng.

## Kiểm thử sau thay đổi

- Build/type-check server và admin-web để đảm bảo không còn import `Equipment`.
- Smoke test các API user liên quan ban-card (chỉ còn character).
- Smoke test trang `Equipment` hiện tại trên admin-web để xác nhận vẫn chạy bình thường với Item data.
- Quét toàn repo đảm bảo không còn tham chiếu model/endpoint legacy `Equipment` ngoài tài liệu lịch sử.

