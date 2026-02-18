# Báo cáo: Các page đã refactor

Tài liệu mô tả các thay đổi sau khi tách UI các trang trong `admin-web/src/pages` thành các component nhỏ trong `admin-web/src/components`, kèm diagram quan hệ giữa các trang và component.

---

## 1. Tổng quan

- **Mục tiêu:** Giảm độ phức tạp từng file page, tăng khả năng tái sử dụng và bảo trì.
- **Cách làm:** Tách phần UI lặp lại (header, phân trang, dropdown ngôn ngữ, thẻ thống kê, v.v.) thành component trong `admin-web/src/components`, sau đó refactor từng page để dùng các component này.

---

## 2. Component mới

### 2.1 Component dùng chung (`src/components/`)

| Component | Mô tả | Dùng tại |
|-----------|--------|----------|
| `PageHeader` | Tiêu đề trang (title + description, gradient tùy chọn) | Mọi page có header thống nhất |
| `Pagination` | Phân trang (Previous/Next, hiển thị range) | Users, Logs, Payments, Localization |
| `LangDropdown` | Dropdown chọn ngôn ngữ (en / vi / ja) | AdventureCards, CharacterDetail, Equipment |
| `StatCard` | Thẻ thống kê (icon, title, value, gradient) | Dashboard |
| `ElementIcon` | Icon element (ảnh hoặc "none" với dấu X) | Characters, CharacterDetail |
| `FileTreeNode` | Node cây thư mục/tệp (expand/collapse, chọn file) | AdventureCards (chọn ảnh) |

### 2.2 Component theo từng khu vực

| Thư mục | Component | Mô tả | Dùng tại |
|---------|-----------|--------|----------|
| `dashboard/` | `RevenueChart` | Line chart (revenue hoặc users) | Dashboard |
| `dashboard/` | `DashboardSkeleton` | Skeleton loading | Dashboard |
| `users/` | `UserRow` | Một dòng user (avatar, email, role, xu, badge) | Users |
| `characters/` | `CharacterCard` | Thẻ nhân vật (ảnh, element, tên) | Characters |

---

## 3. Các page đã refactor

| Page | Đường dẫn route | Component đã dùng | Ghi chú |
|------|-----------------|-------------------|--------|
| **Dashboard** | `/` | PageHeader, StatCard, RevenueChart, DashboardSkeleton | Rút gọn logic, chart tái sử dụng |
| **Users** | `/users` | PageHeader, Pagination, UserRow | List user gọn, phân trang chung |
| **UserDetail** | `/users/:id` | PageHeader | Chỉ thay header |
| **Characters** | `/characters` | PageHeader, CharacterCard | Grid thẻ nhân vật tách component |
| **CharacterDetail** | `/characters/:id` | PageHeader, LangDropdown, ElementIcon | Header + ngôn ngữ + icon element |
| **AdventureCards** | `/adventure-cards` | PageHeader, LangDropdown, FileTreeNode | Bỏ TreeNode nội bộ, dùng FileTreeNode |
| **Equipment** | `/equipment` | PageHeader, LangDropdown | Header + dropdown ngôn ngữ |
| **Maps** | `/maps` | PageHeader | Chỉ thay header |
| **Localization** | `/localization` | PageHeader, Pagination | Header + phân trang chung |
| **Logs** | `/logs` | PageHeader, Pagination | Header + phân trang, bỏ Button không dùng |
| **Payments** | `/payments` | PageHeader, Pagination | Header + phân trang |
| **TestPayos** | `/test-payos` | PageHeader | Chỉ thay header |

**Không refactor trong đợt này:** Login (form + particles), UserPayments (flow riêng).

---

## 4. Sơ đồ quan hệ

### 4.1 Cấu trúc routing và trang (Layout → Pages)

```mermaid
flowchart TB
  subgraph Public
    Login["/login - Login"]
  end

  subgraph Private["Private (Layout)"]
    Dashboard["/ - Dashboard"]
    Users["/users - Users"]
    UserDetail["/users/:id - UserDetail"]
    Payments["/payments - Payments"]
    TestPayos["/test-payos - TestPayos"]
    Characters["/characters - Characters"]
    CharacterDetail["/characters/:id - CharacterDetail"]
    Equipment["/equipment - Equipment"]
    AdventureCards["/adventure-cards - AdventureCards"]
    Maps["/maps - Maps"]
    Localization["/localization - Localization"]
    Logs["/logs - Logs"]
  end

  UserPayments["/user/:id/Payments - UserPayments"]

  Login --> Private
  Private --> UserPayments
```

### 4.2 Quan hệ Page → Component (trang dùng component nào)

```mermaid
flowchart LR
  subgraph Pages["Pages"]
    P1[Dashboard]
    P2[Users]
    P3[UserDetail]
    P4[Characters]
    P5[CharacterDetail]
    P6[AdventureCards]
    P7[Equipment]
    P8[Maps]
    P9[Localization]
    P10[Logs]
    P11[Payments]
    P12[TestPayos]
  end

  subgraph Shared["Shared Components"]
    PageHeader[PageHeader]
    Pagination[Pagination]
    LangDropdown[LangDropdown]
    StatCard[StatCard]
    ElementIcon[ElementIcon]
    FileTreeNode[FileTreeNode]
  end

  subgraph Domain["Domain Components"]
    RevenueChart[RevenueChart]
    DashboardSkeleton[DashboardSkeleton]
    UserRow[UserRow]
    CharacterCard[CharacterCard]
  end

  P1 --> PageHeader
  P1 --> StatCard
  P1 --> RevenueChart
  P1 --> DashboardSkeleton

  P2 --> PageHeader
  P2 --> Pagination
  P2 --> UserRow

  P3 --> PageHeader
  P4 --> PageHeader
  P4 --> CharacterCard
  P5 --> PageHeader
  P5 --> LangDropdown
  P5 --> ElementIcon
  P6 --> PageHeader
  P6 --> LangDropdown
  P6 --> FileTreeNode
  P7 --> PageHeader
  P7 --> LangDropdown
  P8 --> PageHeader
  P9 --> PageHeader
  P9 --> Pagination
  P10 --> PageHeader
  P10 --> Pagination
  P11 --> PageHeader
  P11 --> Pagination
  P12 --> PageHeader
```

### 4.3 Cây phụ thuộc component (component dùng component con)

```mermaid
flowchart TB
  subgraph Pages["Pages (ví dụ)"]
    Dashboard
    Users
    Characters
    AdventureCards
  end

  subgraph Components["Components"]
    PageHeader
    Pagination
    LangDropdown
    StatCard
    ElementIcon
    FileTreeNode
    RevenueChart
    DashboardSkeleton
    UserRow
    CharacterCard
  end

  subgraph UI["UI Primitives"]
    Card[card]
    Button[button]
    Badge[badge]
    Skeleton[skeleton]
  end

  Dashboard --> PageHeader
  Dashboard --> StatCard
  Dashboard --> RevenueChart
  Dashboard --> DashboardSkeleton
  Users --> PageHeader
  Users --> Pagination
  Users --> UserRow
  Characters --> PageHeader
  Characters --> CharacterCard
  AdventureCards --> PageHeader
  AdventureCards --> LangDropdown
  AdventureCards --> FileTreeNode

  StatCard --> Card
  RevenueChart --> Card
  DashboardSkeleton --> Card
  DashboardSkeleton --> Skeleton
  UserRow --> Badge
  CharacterCard --> Card
  CharacterCard --> ElementIcon
  LangDropdown --> Button
  Pagination --> Button
```

### 4.4 Luồng điều hướng giữa các trang (navigation)

```mermaid
flowchart TB
  Login["Login"]
  Dashboard["Dashboard"]
  Users["Users"]
  UserDetail["User Detail"]
  Characters["Characters"]
  CharacterDetail["Character Detail"]
  Payments["Payments"]
  UserPayments["User Payments"]
  AdventureCards["Adventure Cards"]
  Equipment["Equipment"]
  Maps["Maps"]
  Localization["Localization"]
  Logs["Logs"]
  TestPayos["Test Payos"]

  Login -->|admin| Dashboard
  Login -->|user| UserPayments
  Dashboard --> Users
  Dashboard --> Payments
  Dashboard --> Characters
  Dashboard --> Equipment
  Dashboard --> AdventureCards
  Dashboard --> Maps
  Dashboard --> Localization
  Dashboard --> Logs
  Dashboard --> TestPayos
  Users -->|click user| UserDetail
  UserDetail -->|Back| Users
  UserDetail -->|link nạp tiền| UserPayments
  Characters -->|click card| CharacterDetail
  CharacterDetail -->|Back| Characters
```

---

## 5. Cấu trúc thư mục sau refactor

```
admin-web/src/
├── components/
│   ├── Layout.tsx
│   ├── PageHeader.tsx
│   ├── Pagination.tsx
│   ├── LangDropdown.tsx
│   ├── StatCard.tsx
│   ├── ElementIcon.tsx
│   ├── FileTreeNode.tsx
│   ├── dashboard/
│   │   ├── RevenueChart.tsx
│   │   └── DashboardSkeleton.tsx
│   ├── users/
│   │   └── UserRow.tsx
│   ├── characters/
│   │   └── CharacterCard.tsx
│   └── ui/
│       ├── card.tsx
│       ├── skeleton.tsx
│       ├── badge.tsx
│       └── button.tsx
└── pages/
    ├── Dashboard.tsx
    ├── Users.tsx
    ├── UserDetail.tsx
    ├── Characters.tsx
    ├── CharacterDetail.tsx
    ├── AdventureCards.tsx
    ├── Equipment.tsx
    ├── Maps.tsx
    ├── Localization.tsx
    ├── Logs.tsx
    ├── Payments.tsx
    ├── TestPayos.tsx
    ├── Login.tsx
    └── UserPayments.tsx
```

---

## 6. Ghi chú

- Các diagram dùng **Mermaid**. Có thể xem trực tiếp trên GitHub, trong VS Code (extension Mermaid), hoặc tại [mermaid.live](https://mermaid.live).
- File báo cáo: `admin-web/doc/Các page đã refactor.md`.
