# Lượt chạy tìm kiếm mang theo các phiên bản chiến lược được chọn

## Why this (Lý do lựa chọn)

T20 yêu cầu người dùng chọn chiến lược nào sẽ tham gia vào không gian tìm kiếm, đồng thời yêu cầu danh sách này phải lấy từ metadata của registry thay vì hardcode tên trên giao diện UI. Do đó, lượt chạy tìm kiếm mang theo các tham chiếu chiến lược được chọn từ `/strategies`: bao gồm cả `id` và `version`. Bộ nguồn ứng viên (candidate source) sẽ phân giải các tham chiếu đó ngược lại thành metadata của registry trước khi sinh ứng viên.

Điều này giữ frontend đúng ở ranh giới của nó: nó chọn từ metadata và khởi động một lượt chạy có giới hạn, nhưng không bao giờ tự xây dựng ứng viên, tính toán tham số hay quyết định nhóm nào là hợp lệ. Các lựa chọn đó nằm lại trong bộ sinh và registry nơi T17 và ADR 0012 đã đặt chúng. Việc bao gồm `version` tuân thủ định danh của registry và giúp hai phiên bản đã đăng ký của cùng một chiến lược có thể được chọn độc lập với nhau.

## What else we looked at (Các phương án khác đã cân nhắc)

**Để frontend gửi đặc tả ứng viên (candidate specs)** — điều này sẽ giúp màn hình T20 triển khai dễ dàng, nhưng nó sẽ chuyển việc xây dựng ứng viên và lựa chọn tham số vào React. Điều này vi phạm quy tắc "frontend chỉ render, không bao giờ tính toán" và biến mỗi chiến lược mới thành một thay đổi trên giao diện UI.

**Tạo các không gian tìm kiếm được đặt tên và lưu trữ** — điều này sẽ giúp các lượt chạy có thể tái sử dụng, nhưng nó bổ sung thêm một khái niệm lưu trữ mới trước khi bản mô tả yêu cầu (brief) thực sự cần đến. Định danh Dataset đã sở hữu tính khả so của bảng xếp hạng; định danh không gian tìm kiếm có thể đợi cho đến khi người dùng cần chạy lại các thực nghiệm có tên cụ thể.

**Tiếp tục sử dụng mọi chiến lược đã đăng ký** — điều này khớp với T17 nhưng bỏ lỡ bước lựa chọn tường minh của T20. Nó cũng làm mất đi khoảnh khắc demo trong Section 46 nơi MA, RSI, Bollinger và Support Resistance được chọn trước khi nhấn START SEARCH.

## Trade-offs (Đánh đổi)

Một lượt chạy không còn chỉ được mô tả đơn thuần bằng dataset và giới hạn chạy; việc gỡ lỗi nó cũng cần các tham chiếu chiến lược đã được chọn. API phải từ chối các cặp `id@version` không xác định, và một lượt chạy định hướng miền vẫn có thể cạn kiệt ngay lập tức nếu các tham chiếu được chọn không chứa đủ các nhóm mà bộ sinh đó yêu cầu.
