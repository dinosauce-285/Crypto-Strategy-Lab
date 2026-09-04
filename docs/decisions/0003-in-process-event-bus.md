# Các module giao tiếp qua bus sự kiện nội tiến trình (in-process event bus)

## Why this (Lý do lựa chọn)

Mục 34 của đề bài liệt kê chín sự kiện nội bộ và nêu rõ mục đích của chúng: worker chạy backtest tuyệt đối không được gọi trực tiếp service bảng xếp hạng (leaderboard), nó chỉ phát ra sự kiện thông báo một chiến lược vừa được đánh giá xong (`strategy.evaluated`) và service xếp hạng sẽ lắng nghe sự kiện đó. Khi đó, không module nào cần biết đến sự tồn tại của module kia. Sự tách rời khớp nối (loose coupling) này chính là thứ mà mục đó yêu cầu chứng minh, và là điều mà câu hỏi 4 trong mục 40 thực sự kiểm tra.

Nếu gọi hàm trực tiếp giữa các service, chúng ta không thể khẳng định tính tách rời một cách trung thực. Worker khi đó sẽ nắm giữ tham chiếu trực tiếp đến leaderboard, và đoạn văn trong báo cáo ca ngợi về việc giảm thiểu coupling sẽ chỉ là mô tả một thứ không hề tồn tại trong code.

Một bus sự kiện nội tiến trình mang lại sự tách rời mong muốn mà không cần phải cài đặt thêm một service hạ tầng bên ngoài. NestJS tích hợp sẵn cơ chế này (`EventEmitter2`), nhờ đó bên phát (publisher) và bên nhận (subscriber) chỉ là các decorator khai báo thay vì phải dựng hạ tầng phức tạp, và danh sách chín tên sự kiện trở thành hợp đồng chuẩn thay vì phải quản lý chín chữ ký phương thức rải rác khắp các module.

Khả năng mở rộng trong tương lai là nửa lý do quan trọng còn lại. Khi vòng lặp backtest cần mở rộng ra nhiều tiến trình máy chủ, tầng transport bên dưới bus sự kiện có thể hoán đổi sang message broker ngoài mà toàn bộ mã nguồn phát và nhận sự kiện không cần thay đổi một dòng nào. Khả năng giải thích điều này — và chỉ rõ vị trí ranh giới kỹ thuật diễn ra sự chuyển đổi đó — là câu trả lời xuất sắc hơn bất kỳ kế hoạch dung lượng lý thuyết nào trước câu hỏi: "hệ thống thay đổi thế nào khi số lượng backtest tăng từ 100 lên 100.000".

## What else we looked at (Các phương án khác đã cân nhắc)

**Gọi hàm trực tiếp giữa các service** — đơn giản nhất và thực tế cho một hệ thống nhỏ. Nhưng ở đây nó đánh mất chính tiêu chí kiến trúc đang được chấm điểm, trong khi mục 34 đã nêu rõ phương án kỳ vọng. Nó cũng đồng nghĩa với việc service xếp hạng sẽ nằm trên đường dẫn tới hạn (critical path) của mỗi lượt backtest: một bước xếp hạng chậm sẽ kéo chậm cả tiến trình worker.

**Dùng Message Broker bên ngoài ngay từ đầu — Redis Pub/Sub, RabbitMQ, Kafka** — giải quyết một bài toán phân tán mà hệ thống hiện tại chưa gặp phải, với cái giá là phải vận hành và biện minh cho một service cồng kềnh. Mục 38 cảnh báo rằng công nghệ phức tạp không tự mang lại điểm số nếu thiếu lý do chính đáng, và ở giai đoạn này chúng ta không có động lực kiến trúc thực tế nào để chứng minh sự cần thiết.

## Trade-offs (Đánh đổi)

Bus sự kiện nội tiến trình sẽ biến mất khi tiến trình bị tắt. Không có dữ liệu nào được lưu trữ bền vững, không có cơ chế gửi lại khi lỗi, và không có sự đảm bảo về thứ tự ngoài những gì emitter cung cấp. Điều này hoàn toàn chấp nhận được đối với các thông báo giao diện và cập nhật bảng xếp hạng; nhưng tuyệt đối không chấp nhận được đối với các tác vụ công việc bắt buộc không được thất lạc. Vì vậy hàng đợi backtest được tách riêng thành một cơ chế độc lập có chủ đích thay vì xếp chồng lên event bus.

Sự kiện cũng làm cho luồng điều khiển (control flow) khó theo dõi hơn khi đọc code. Đọc một hàm không còn cho bạn biết ngay ai sẽ phản hồi lại sự kiện đó — bạn phải tìm kiếm các listener. Việc tập trung khai báo chín tên sự kiện tại một nơi duy nhất (`packages/contracts/src/events.ts`) là cách giữ cho hệ thống trong tầm kiểm soát, và danh sách đó phải luôn chuẩn xác nếu không muốn sự tách rời biến thành một mê cung khó gỡ.
