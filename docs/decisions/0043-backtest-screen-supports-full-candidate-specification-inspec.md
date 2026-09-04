# Màn hình Backtest hỗ trợ kiểm tra chi tiết đặc tả ứng viên đầy đủ và tự động thực thi

## Why this (Lý do lựa chọn)

Section 46 bước 6 yêu cầu khi nhấp vào một chiến lược được xếp hạng trên Leaderboard, hệ thống sẽ mở biểu đồ trực quan hiển thị các điểm đánh dấu mua và bán, các đường trung bình động, các mức hỗ trợ/kháng cự và các chỉ số hiệu suất giao dịch. Trong hệ thống, các chiến lược được phát hiện bởi quá trình tìm kiếm là các đặc tả ứng viên tổng hợp (`CandidateSpec`) kết hợp nhiều thành viên với các trọng số và tham số cụ thể.

Việc điều hướng đến màn hình Backtest với `CandidateSpec` đầy đủ và tự động kích hoạt thực thi backtest giúp bảo toàn độ trung thực toàn vẹn của công thức ứng viên. Máy chủ thực thi chiến lược tổng hợp và trả về lịch sử giao dịch, các chỉ số và các lớp phủ chỉ báo (MA, Bollinger Bands, Support/Resistance). Người dùng được hiển thị ngay lập tức biểu đồ nến tương tác, nhật ký giao dịch và bảng chỉ số mà không cần phải chọn lại tham số hay bấm nút chạy thủ công.

## What else we looked at (Các phương án khác đã cân nhắc)

**Một modal hoặc panel kiểm tra nội tuyến trực tiếp trên màn hình Leaderboard** — phương án này tránh được việc điều hướng trang, nhưng làm trùng lặp biểu đồ nến, logic phủ chỉ báo và bảng nhật ký giao dịch trên hai màn hình riêng biệt, làm phình to kích thước gói bundle frontend và gánh nặng bảo trì.

**Cắt ngắn công thức tổng hợp chỉ lấy thành viên đầu tiên (`members[0]`)** — cách này coi mỗi ứng viên như một chiến lược đơn lẻ. Mặc dù đơn giản, nó phá vỡ hoàn toàn các công thức kết hợp do tìm kiếm tạo ra (ví dụ: `MA + RSI + Bollinger + SR`), dẫn đến việc hiển thị các giao dịch và chỉ báo không chính xác, không phản ánh đúng hiệu suất thực sự của chiến lược được xếp hạng.

**Điều hướng với các trường đầu vào được điền sẵn nhưng không tự động chạy** — yêu cầu người dùng nhấp thủ công vào "Run Backtest" sau khi nhấp vào một mục trên bảng xếp hạng sẽ khiến màn hình ở trạng thái nhàn rỗi không có dữ liệu, vi phạm quy trình kiểm tra nhanh của §46 bước 6.

## Trade-offs (Đánh đổi)

Bảng cấu hình chiến lược của màn hình Backtest phải hỗ trợ chế độ kép: chỉnh sửa các tham số chiến lược đơn lẻ linh hoạt qua dropdown, và hiển thị các thẻ công thức tổng hợp chỉ đọc với trọng số và tham số của các thành viên khi kiểm tra các ứng viên kết hợp. Một hành động tường minh "Switch to Standalone" (Chuyển sang chế độ độc lập) được cung cấp nếu người dùng muốn chuyển trở lại cấu hình chiến lược đơn lẻ.
