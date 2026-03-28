---
name: Database field views
overview: "Bổ sung 3 chế độ xem cấu trúc field trong từng collection (MongoDB scan) trên `DatabaseManagement.tsx`: bảng phẳng hiện tại, cây thư mục theo path, và đồ thị React Flow theo chuỗi prefix path; click node trên Flow hiển thị chi tiết field (leaf/intermediate có trong scan)."
todos:
  - id: utils-graph
    content: "Thêm fieldPathTreeUtils: split path, prefix list, build nodes/edges + Map path→summary"
    status: completed
  - id: tree-panel
    content: "FieldPathTreePanel: cây folder từ filteredFieldSummaries + fieldSearch"
    status: completed
  - id: flow-panel
    content: "FieldPathFlowPanel: ReactFlow, layout theo depth, click node → chi tiết"
    status: completed
  - id: wire-page
    content: "DatabaseManagement: 3 tab List | Tree | Flow trong card collection đã chọn"
    status: completed
isProject: false
---

# Database Management: 3 tab xem cấu trúc field + React Flow

## Bối cảnh dữ liệu

- API scan trả `[FieldTypeSummary](admin-web/src/services/databaseManagementService.ts)` (`path`, `types`, `docsWithPath`, `examples`, …).
- Backend build path theo quy tắc trong `[server/src/services/databaseManagementService.ts](server/src/services/databaseManagementService.ts)`: key gốc, lồng nhau `a.b`, mảng `arr` + phần tử `arr[]`, `arr[].x` (tách segment bằng `.`; segment `arr[]` là một “thư mục” hợp lệ).

**“Chuỗi quan hệ” trên Flow:** edge từ path cha → path con khi `child` có dạng `parent + '.' + nextSegment` (đồ thị cây/DAG theo cấu trúc document). Không có metadata quan hệ giữa các **collection** trong response hiện tại; nếu sau này cần nối collection với nhau sẽ phải mở rộng API hoặc heuristics (ObjectId refs).

## Thay đổi UI chính (`[admin-web/src/pages/DatabaseManagement.tsx](admin-web/src/pages/DatabaseManagement.tsx)`)

- Giữ nguyên hàng tab chọn **collection** (MongoDB) như hiện tại.
- Trong card của collection đã chọn, **thêm một hàng 3 tab** (hoặc toggle tương tự style pill đang dùng):
  1. **Danh sách** — bảng field hiện tại (logic `filteredFieldSummaries` giữ nguyên).
  2. **Cây** — view folder: cùng filter `fieldSearch`; render cây theo segment path (expand/collapse).
  3. **Flow** — `ReactFlow` + `Controls` + `MiniMap` + `Background` (theo pattern `[admin-web/src/components/code/CharacterClassAstFlow.tsx](admin-web/src/components/code/CharacterClassAstFlow.tsx)`); import `reactflow/dist/style.css` một lần trong component Flow hoặc layout.

## Module hỗ trợ (tránh phình `[DatabaseManagement.tsx](admin-web/src/pages/DatabaseManagement.tsx)`)

Tạo file tiện ích + component nhỏ, ví dụ:

- `[admin-web/src/components/database/fieldPathTreeUtils.ts](admin-web/src/components/database/fieldPathTreeUtils.ts)` (hoặc tên tương đương):
  - `splitFieldPath(path: string): string[]` — `path.split('.')` (đủ với backend hiện tại).
  - `buildPrefixPaths(fullPath: string): string[]` — sinh mọi prefix để tạo node/edge.
  - `buildFieldPathGraph(summaries: FieldTypeSummary[]): { nodeIds: Set<string>; edges: { from: string; to: string }[] }` — duyệt `filteredFieldSummaries`, thêm mọi prefix; edge nối prefix liền kề.
  - `mapPathToSummary: Map<string, FieldTypeSummary>` từ danh sách đã scan (tra cứu O(1) khi click node).
- `[admin-web/src/components/database/FieldPathTreePanel.tsx](admin-web/src/components/database/FieldPathTreePanel.tsx)`: nhận `filteredFieldSummaries`, build trie/map nhánh → render đệ quy (folder icon / tên segment cuối), có thể highlight khi chọn (tùy chọn).
- `[admin-web/src/components/database/FieldPathFlowPanel.tsx](admin-web/src/components/database/FieldPathFlowPanel.tsx)`:
  - `useMemo` tính `nodes`, `edges` từ graph + **layout đơn giản không thêm dependency** (ví dụ: group theo `depth = segmentCount(path)`, trong mỗi depth sort `path` rồi gán `x = index * stepX`, `y = depth * stepY`; gọi `fitView` sau khi mount / đổi collection / đổi filter — dùng `useReactFlow` + `useEffect`).
  - `onNodeClick`: set state `selectedPath`; panel chi tiết bên dưới hoặc cạnh canvas (types, typeCount, docsWithPath/examples, full path monospace). Nếu không có `FieldTypeSummary` cho prefix (trường hợp hiếm): hiển thị “intermediate path” + chỉ path.
  - Giới hạn thực tế: khi `filteredFieldSummaries.length` rất lớn, có thể hiển thị cảnh báo text hoặc chỉ layout top-N (ưu tiên **dùng cùng filter search** như 2 tab kia để người dùng thu hẹp); nếu cần tối ưu sau mới thêm virtualize/collapse.

## Luồng tương tác (tóm tắt)

```mermaid
flowchart LR
  scan[Scan MongoDB]
  pickCol[Chọn collection]
  tab[Tab: List / Tree / Flow]
  scan --> pickCol --> tab
  tab --> listView[Bảng field]
  tab --> treeView[Cây path]
  tab --> flowView[ReactFlow]
  flowView --> click[Click node]
  click --> detail[Chi tiết FieldTypeSummary]
```



## Kiểm tra

- Chạy `npm run build` trong `admin-web` (TypeScript + Vite).
- Thử collection có path sâu + `[]` để đảm bảo cây và edge đúng thứ tự cha–con.

## Ghi chú về “lưới Collection”

Nếu ý bạn là **một canvas React Flow riêng: mỗi ô là một collection**, cần làm rõ edge (hiện API không trả). Kế hoạch này tập trung **mỗi collection → 3 tab cấu trúc field** như mô tả; tách component để sau đó tái sử dụng cho overview collection nếu cần.