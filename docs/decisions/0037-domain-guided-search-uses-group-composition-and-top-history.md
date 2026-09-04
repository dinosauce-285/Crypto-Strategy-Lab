# Tìm kiếm định hướng miền nghiệp vụ sử dụng cấu thành nhóm và lịch sử kết quả hàng đầu

## Why this (Lý do lựa chọn)

T17 cần hai thuật toán tìm kiếm có thể hoán đổi cho nhau mà không làm thay đổi worker, queue, backtester hay evaluator. Cả hai thuật toán do đó đều nằm sau `CandidateSource` và xuất ra cùng một định dạng `CandidateSpec`; lượt chạy chọn một chế độ, và toàn bộ luồng xử lý sau bộ sinh chỉ nhìn thấy các ứng viên.

Quy tắc định hướng miền nghiệp vụ (domain-guided rule) là: một chiến lược Xu hướng (Trend), một chiến lược Động lượng (Momentum), và một chiến lược bối cảnh (context) từ Cấu trúc (Structure), Biến động (Volatility) hoặc Thông tin (Information). Trend xác định hướng đi, Momentum kiểm tra sự cạn kiệt, và vị trí bối cảnh sẽ đặt câu hỏi liệu cấu trúc giá, độ biến động hay tin tức có xác nhận thiết lập giao dịch hay không. Thiết kế này sử dụng trường `group` đã được chọn trong `0012`, do đó việc thêm chiến lược phân tích tâm lý (sentiment) sau này chỉ là một thay đổi đăng ký: nó khai báo `Information` và tham gia vào cùng vị trí đó mà không đòi hỏi T17 phải biết tên nó từ trước.

Lịch sử được giao cho bộ sinh là số lượng lượt chạy cộng với 25 ứng viên hoàn thành hàng đầu theo tổng lợi nhuận. Điều này duy trì cam kết của `0013` rằng các bộ sinh tương lai có thể học hỏi từ điểm số trước đó, nhưng đây là một góc nhìn có giới hạn chứ không phải toàn bộ bảng thực nghiệm. Bộ sinh vẫn nhận các đặc tả thực tế chứ không phải quyền truy cập cơ sở dữ liệu, vì vậy nó có thể sinh ra các phần tử cha hoặc tránh lặp lại mà không bị biến thành một repository.

## What else we looked at (Các phương án khác đã cân nhắc)

**Mỗi nhóm có sẵn lấy đúng một chiến lược** — gọn gàng và dễ giải thích. Nhưng cách này sẽ thất bại vào ngày một nhóm nào đó vắng mặt, và làm số lượng chiến lược thành viên của ứng viên phình to ra mỗi khi một nhóm mới xuất hiện, làm thay đổi hình dạng trọng số và không gian tìm kiếm như một tác dụng phụ của việc bổ sung chiến lược.

**Chỉ gồm Trend cộng Momentum cộng Structure** — ví dụ mà `0012` đã nêu. Cách này tốt cho registry hiện tại, nhưng nó sẽ ngăn chiến lược Information tham gia vào tìm kiếm định hướng cho đến khi T17 được chỉnh sửa, đó chính xác là kịch bản T25 mà kiến trúc này nhằm phòng tránh.

**Truyền toàn bộ ứng viên đã thử nghiệm dưới dạng lịch sử** — linh hoạt nhất cho một bộ sinh di truyền (genetic) hoặc Bayesian trong tương lai. Nhưng ở mức mười nghìn ứng viên, nó biến một lệnh gọi hàm thành một đợt truyền dữ liệu khổng lồ và cám dỗ bộ sinh hành xử giống như một truy vấn báo cáo. Góc nhìn kết quả hàng đầu là phần mà các thuật toán học máy thường cần trước tiên.

## Trade-offs (Đánh đổi)

Vị trí bối cảnh coi Structure, Volatility và Information là các lựa chọn thay thế nhau. Một ứng viên mạnh gồm bốn chiến lược như MA + RSI + Bollinger + Sentiment sẽ không được tạo ra bởi bộ sinh định hướng cho đến khi quy tắc được mở rộng; Random Search vẫn có thể rút thăm ra ứng viên này.

Top 25 theo tổng lợi nhuận chưa phải là công thức bảng xếp hạng cuối cùng. T18 có thể xếp hạng dựa trên điểm tổng hợp sau này, do đó một bộ sinh thích ứng được xây dựng trước thời điểm đó sẽ học từ một tín hiệu thô hơn. Điều đó có thể chấp nhận được đối với T17 vì tổng lợi nhuận đã tồn tại sẵn và quy tắc xếp hạng cuối cùng vẫn chưa được chốt.

Các trọng số cân bằng trên lưới 0.1 chỉ xấp xỉ bằng nhau cho ba thành viên, do đó nhóm đầu tiên nhận 0.4 và các nhóm khác nhận 0.3. Điều này giữ cho trình xác thực và mã băm ổn định, nhưng nó tạo cho Trend một sự thiên lệch nhỏ bắt nguồn từ độ chia của lưới chứ không phải từ bằng chứng thực tế.
