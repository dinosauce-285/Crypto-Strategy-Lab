# Tác vụ backtest chạy qua hàng đợi BullMQ trên Redis

## Why this (Lý do lựa chọn)

Mục 43 của đề bài làm một phép toán cụ thể: 10.000 ứng viên, mỗi ứng viên mất 2 giây backtest sẽ tốn tổng cộng 20.000 giây (hơn 5,5 giờ) nếu chỉ chạy trên một worker duy nhất. Chỉ riêng con số này đã là lý lẽ đanh thép cho việc xử lý song song, nhưng tốc độ chỉ là một nửa lý do.

Mục 24 yêu cầu các worker phải chạy song song, có khả năng thử lại khi gặp sự cố (retry on failure), và có thể tạm dừng (pause) cũng như tiếp tục (resume). Mục 23 đòi hỏi phải có điều kiện dừng tường minh. Mục 32.7 yêu cầu thống kê số lượng job thất bại và thời gian trung bình của một lượt backtest. Đó là bốn hành vi nghiệp vụ hoàn toàn riêng biệt, và BullMQ cung cấp sẵn toàn bộ chúng — cơ chế retry có giãn cách (exponential backoff), tạm dừng/tiếp tục hàng đợi, và các bộ đếm số liệu mà màn hình giám sát có thể đọc trực tiếp. Tự viết tay các tính năng này trên nền một hàng đợi in-memory trong bộ nhớ sẽ tốn nhiều công sức hơn là cài đặt Redis, và phiên bản tự chế chắc chắn sẽ phát sinh nhiều lỗi tiềm ẩn.

Redis ở đây hoàn toàn có thể biện minh được về mặt kiến trúc, khác hẳn với các vị trí khác trong dự án, bởi vì chúng ta có một yêu cầu thực tế rõ ràng để chỉ vào thay vì chỉ là sở thích cá nhân. Điều này rất quan trọng trước lời cảnh báo của mục 38 về việc đưa công nghệ vào mà không có lý do xác đáng.

## What else we looked at (Các phương án khác đã cân nhắc)

**Hàng đợi in-memory kết hợp Worker Threads** — không cần thêm service bên ngoài, đủ để làm cho vòng lặp chạy được. Nhưng nó bị giới hạn chặt chẽ trong một tiến trình máy tính duy nhất, mất toàn bộ các job đang chạy dở khi restart server, và cả bốn hành vi nghiệp vụ nêu trên đều phải tự code từ đầu. Đây sẽ là lựa chọn đúng nếu vòng lặp chỉ là tính năng phụ (nice-to-have); nhưng đề bài đã định nghĩa nó thành hẳn module số 9 cốt lõi.

**RabbitMQ hoặc Kafka** — tính năng vượt xa mức dự án có thể khai thác. Chi phí không chỉ là việc vận hành chúng, mà là việc phải trả lời câu hỏi: chúng giải quyết bài toán kiến trúc nào mà BullMQ không thể giải quyết, và ở đây không có câu trả lời trung thực nào cho điều đó.

## Trade-offs (Đánh đổi)

Một job đưa vào hàng đợi bắt buộc phải tuần tự hóa được (serialisable), do đó một chiến lược ứng viên phải luân chuyển dưới dạng dữ liệu đặc tả (data spec) thuần túy thay vì một object đang sống. Đây là một ràng buộc nghiêm ngặt đối với các kiểu dữ liệu chung trong contracts, và phải được thống nhất ngay từ đầu thay vì đợi đến lúc bật worker thứ hai mới phát hiện ra.

Dự án không còn chạy được bằng một lệnh duy nhất. Mỗi thành viên và mỗi máy demo đều cần Redis đang hoạt động, điều này làm tăng gánh nặng cho tài liệu hướng dẫn thiết lập và tạo thêm một điểm tiềm ẩn rủi ro có thể gặp sự cố trong buổi thuyết trình demo.

Hệ thống giờ đây tồn tại hai cơ chế hàng đợi theo nghĩa rộng — bus sự kiện cho các thông báo giao diện và BullMQ cho các tác vụ công việc nặng. Trách nhiệm phân định ranh giới rõ ràng thuộc về nhóm: bất kỳ việc gì không được phép mất mát phải đi qua BullMQ, bất kỳ thông báo trạng thái bề mặt nào chỉ cần đi qua event bus.
