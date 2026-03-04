## 🎯 “File > 300 dòng là sai?” — Có đúng không?

👉 **Không có con số tuyệt đối.**
300 dòng không tự động là “code tệ”.
Nhưng nếu file dài vì **quá nhiều trách nhiệm**, đó mới là vấn đề.

---

# 🧠 Nguyên tắc quan trọng hơn số dòng

## ❌ Sai khi:

* 1 file làm quá nhiều việc (fetch, render, validate, animation, state…)
* Khó đọc, khó tìm logic
* Sửa 1 chỗ sợ hỏng chỗ khác

## ✅ Ổn khi:

* Cùng 1 domain
* Logic mạch lạc
* Dễ đọc từ trên xuống
* Có phân chia rõ section

---

# 📏 Vậy 300 dòng có phải chuẩn?

Không có chuẩn chính thức từ:

* React
* Angular
* Vue.js

Thực tế:

| Loại file     | Thường bao nhiêu dòng |
| ------------- | --------------------- |
| Component nhỏ | 50–150                |
| Form lớn      | 200–500               |
| Page phức tạp | 300–700               |
| God object    | 1000+ 😅              |

---

# 🎯 Khi nào NÊN tách?

## 1️⃣ Có nhiều “vùng” logic độc lập

Ví dụ:

```tsx
// fetch data
// render header
// render translation
// render effects
// render preview
// handle save
// handle validation
```

👉 Đây là 6 responsibility → nên tách.

---

## 2️⃣ Bạn phải scroll 3 lần mới thấy toàn bộ file 😅

Đó là dấu hiệu file đang phình.

---

## 3️⃣ Có nhiều if (mode === ...)

Đây là dấu hiệu god component đang hình thành.

---

# 🚫 Khi nào KHÔNG cần tách?

* Chỉ là form dài nhưng cùng 1 mục đích
* Không có logic riêng biệt
* Không tái sử dụng được ở nơi khác

Tách quá nhiều sẽ gây:

* File explosion
* Nhảy qua lại khó đọc
* Over-engineering

---

# 🧠 Nguyên tắc senior thường dùng

Không tách theo “số dòng”
Mà tách theo:

> “Một component nên có 1 lý do để thay đổi.”

(Gần với Single Responsibility Principle)

---

# 🎮 Với admin game card của bạn

Ví dụ:

```
CardDetailPage.tsx (container)
 ├── CardHeader.tsx
 ├── CardForm.tsx
 ├── TranslationEditor.tsx
 ├── EffectEditor.tsx
 └── CardPreview.tsx
```

File page có thể 250–400 dòng vẫn hoàn toàn ổn.

---

# 📊 So sánh tư duy

| Tư duy                   | Kết quả  |
| ------------------------ | -------- |
| Đếm dòng                 | Máy móc  |
| Phân tích responsibility | Bền vững |

---

# 🏁 Kết luận

👉 300 dòng không phải lỗi
👉 Tách khi có nhiều responsibility
👉 Đừng tách chỉ vì nghe “người ta nói”
👉 Nhưng cũng đừng để thành 1200 dòng god object

---

Nếu bạn muốn, bạn có thể nói file dài nhất của bạn bao nhiêu dòng và đang chứa những phần gì, mình sẽ đánh giá xem có nên tách không.
