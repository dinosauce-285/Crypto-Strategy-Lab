# Điều hướng các tab Realtime/Backtest thông qua URL React Router

## Why this (Lý do lựa chọn)

Ứng dụng bắt đầu có màn hình thứ hai (Backtest, bên cạnh Realtime) và yêu cầu sản phẩm là mỗi màn hình phải là một địa chỉ URL thực tế, có thể định danh rõ ràng — tải lại trang trên đường dẫn `/backtest` phải giữ nguyên ở `/backtest`, không bị nhảy ngược về tab mặc định. Yêu cầu duy nhất đó đã định đoạt quyết định này: một biến state lưu index tab trong RAM không thể sống sót qua thao tác F5 reload trang hoặc khi người dùng copy dán URL cho người khác, và việc tự viết tay lại cơ chế đó (đọc tham số từ `window.location`, cập nhật URL khi chuyển tab, xử lý khi mới load) thực chất là tự viết một router phiên bản thiếu kiểm thử cho một component.

Thư viện `react-router` là lựa chọn tự nhiên mà ngăn xếp công nghệ trong `AGENTS.md` hàm ý sử dụng cho nhiệm vụ này (React + Vite không có router tích hợp sẵn), và component `NavLink` của nó cung cấp sẵn kiểu dáng active cho thanh điều hướng — thuộc tính `aria-current` được thư viện tự động xử lý chuẩn xác mà không cần một biến state thứ hai phải đồng bộ thủ công với URL.

## What else we looked at (Các phương án khác đã cân nhắc)

**Lưu trạng thái tab trong bộ nhớ (In-memory state)** (dùng `useState<'realtime' | 'backtest'>` trong `App.tsx`). Không thêm thư viện phụ thuộc nào, và đây từng là cách làm ban đầu. Bị loại bỏ vì việc reload bị nhảy về tab mặc định và không có link chia sẻ được là điểm trừ lớn đối với một màn hình mà người dùng sẽ đánh dấu trang (bookmark) và tham chiếu thường xuyên.

**Tự viết router dựa trên hash URL (`location.hash`, không dùng thư viện)** — tránh phụ thuộc ngoài trong khi vẫn giữ được trạng thái qua reload. Nhưng nó đồng nghĩa với việc phải tự viết và tự bảo trì việc parse URL, bắt sự kiện `popstate` và logic active link — chính là những đoạn code mà `react-router` đã có hàng nghìn bài test kiểm chứng.

## Trade-offs (Đánh đổi)

Thêm một thư viện phụ thuộc mới cho frontend, trên một ứng dụng mà trước đó chỉ có `react`, `react-dom`, `socket.io-client` và `lightweight-charts`.

Ở giai đoạn hai tab hiện tại, ứng dụng chưa khai thác hết các tính năng nâng cao của router (nested routes, loaders, data APIs) — hiện tại chỉ dùng `BrowserRouter` và các `Route` cơ bản. Chúng ta chấp nhận sự dư thừa nhỏ này vì phương án tự code router tiềm ẩn nhiều bug hơn.
