# Các tham số không thể đoán trước được đưa vào đặc tả và giải đáp bởi leaderboard

## Why this (Lý do lựa chọn)

Có hai con số phát sinh từ quy tắc kết hợp tín hiệu, và không con số nào có thể đưa ra một giá trị cố định có cơ sở vững chắc:

Thứ nhất là ngưỡng quyết định (threshold). Mục 14 lấy con số 0.3 làm ví dụ và nói thẳng rằng nhóm có thể tự thiết kế phương pháp riêng, do đó 0.3 không bắt nguồn từ một cơ sở toán học tất yếu nào. Tệ hơn, nó hành xử thiếu nhất quán theo cách không ai cố ý chọn: một thành viên đơn độc phát tín hiệu đạt điểm 0.5 trong tổ hợp 2 thành viên, 0.33 trong tổ hợp 3 thành viên, và 0.25 trong tổ hợp 4 thành viên. Vì vậy ở ngưỡng 0.3, tiếng nói đơn độc đó sẽ được kích hoạt hành động trong tổ hợp 3 thành viên nhưng lại bị phớt lờ trong tổ hợp 4 thành viên.

Thứ hai là khoảng thời gian một sự kiện giao cắt (crossover) duy trì tiếng nói của nó. Sự kiện giao cắt MA chỉ diễn ra trên đúng một cây nến; trong khi trạng thái RSI dưới 30 có thể kéo dài suốt 20 cây nến liên tiếp. Nếu cộng trực tiếp, thành viên lặp lại liên tục sẽ lấn át hoàn toàn tổ hợp và sự kiện giao cắt sẽ bị phủ quyết ngay khoảnh khắc nó vừa xuất hiện — không phải vì nó dở, mà vì tần suất xuất hiện quá ít. Giải pháp là làm suy giảm dần (fade/decay) độ mạnh của tín hiệu giao cắt qua các cây nến tiếp theo, và ADR `0006` cung cấp sẵn độ mạnh cho việc đó. Nhưng suy giảm qua bao nhiêu cây nến lại là một con số khác không có cơ sở lý thuyết nào để chốt cứng.

Yêu cầu người dùng tự gõ hai con số này là không thực tế. Trọng số thì có thể tranh luận — câu nói *"Tôi tin tưởng hỗ trợ/kháng cự hơn RSI"* là một nhận định có nghĩa. Còn ngưỡng threshold là một con số trừu tượng trên một thang điểm mà người dùng chưa từng thấy, và thời gian suy giảm là một phỏng đoán mơ hồ. Đưa chúng vào form nhập liệu chỉ là ép người dùng đoán mò rồi ghi nhận phỏng đoán đó như một lựa chọn sáng suốt.

Vì vậy, không con số nào được chốt bằng tranh cãi lý thuyết. Cả hai trở thành một phần thuộc tính của chính ứng viên, và **bảng xếp hạng leaderboard sẽ đưa ra câu trả lời**:

- `threshold` là một trường trong `CandidateSpec`, lớn hơn 0 và nhỏ hơn 1, nằm trên lưới bước nhảy 0.1.
- Thời gian suy giảm (decay length) là một tham số bình thường được khai báo trong metadata của chiến lược với dải giá trị min/max, nhờ đó `decay: 0` biểu thị hành vi cũ không suy giảm.

Lợi ích của cách tiếp cận này: `MA+RSI @0.3` và `MA+RSI @0.5` là hai ứng viên trên cùng một dataset, cùng nằm trên một bảng xếp hạng, chỉ khác nhau duy nhất một con số. Muốn biết cái nào tốt hơn chỉ việc đọc hai dòng trên bảng xếp hạng.

Nếu giữ chúng dưới dạng hằng số ghi cứng trong code thì việc so sánh này là bất khả thi. Thử một ngưỡng thứ hai sẽ đồng nghĩa với việc sửa code tổ hợp, làm thay đổi hành vi, kéo theo việc phải tăng version theo ADR `0009` — và khi đó năm kết quả đem ra so sánh lại đến từ năm phiên bản code khác nhau, không thể đặt cạnh nhau một cách trung thực.

Bộ sinh ứng viên đầu tiên sẽ cố định ngưỡng ở mức 0.3 và thời gian suy giảm ở giá trị mặc định, tương tự như việc để trọng số bằng nhau, giúp hệ thống đạt tới trạng thái có bảng xếp hạng hoạt động được trước khi bắt đầu tiêu tốn ngân sách vào các chiều tham số mở rộng. Việc mở rộng không gian tìm kiếm là thay đổi nằm bên trong generator; đặc tả ứng viên, worker và các màn hình giao diện không cần sửa đổi.

**Đọc câu trả lời cần tránh bẫy overfitting.** Chọn ngưỡng đạt điểm cao nhất trên một dataset duy nhất chính là định nghĩa kinh điển của hiện tượng quá khớp (overfitting) — nó khớp con số đó vào riêng đoạn dữ liệu đó. Cách kiểm tra rất đơn giản: chạy nó trên 2 hoặc 3 dataset khác nhau, khung thời gian khác nhau và tháng khác nhau. Nếu 0.4 chiến thắng ở mọi nơi thì nó là giá trị tối ưu thật. Nếu mỗi lần chạy ra một giá trị thắng cuộc khác nhau thì ngưỡng không quan trọng lắm, và kết luận đúng đắn là giữ nguyên 0.3 và ghi nhận lại rằng tham số này đã được đo lường và thấy không nhạy cảm. Kết quả thứ hai trông giống như thất bại nhưng thực ra không phải: biết được nút vặn nào không đáng bận tâm chính là hiểu sâu về hệ thống.

## What else we looked at (Các phương án khác đã cân nhắc)

**Giữ cả hai dưới dạng hằng số và chọn bằng tranh luận** — không thêm trường mới, không mở rộng không gian tìm kiếm. Nhưng nó trả lời câu hỏi bằng định kiến cá nhân trong một đồ án mà toàn bộ mục đích là trả lời các câu hỏi bằng thực nghiệm.

**Hỏi người dùng trên màn hình chạy đơn lẻ (single-run screen)** — form đã có sẵn các trường, thêm ô nhập threshold không tốn công. Nhưng người dùng không có căn cứ để điền. Nó chỉ hợp lý khi màn hình vẽ thêm biểu đồ điểm tổng hợp trên từng cây nến kèm các đường kẻ ngưỡng trực quan để người dùng điều chỉnh bằng mắt.

**Tách thành thuộc tính `signalKind: 'event' | 'state'` trên metadata chiến lược** — phương án phân biệt tường minh giữa sự kiện tức thời và trạng thái kéo dài. Bị loại bỏ vì nó tạo thêm một nhánh rẽ bên trong phép kết hợp và thêm một trường vào shared type chỉ để diễn đạt thứ mà chiến lược vốn đã có thể thể hiện qua độ mạnh (strength) nó trả về.

## Trade-offs (Đánh đổi)

Mỗi chiều tham số mới sẽ nhân rộng không gian tìm kiếm. Một ngưỡng với 5 giá trị và thời gian suy giảm với 11 giá trị sẽ mở rộng không gian của một tổ hợp 3 thành viên lên gấp 55 lần trên 36 bộ trọng số. Thuật toán Random Search lấy mẫu ngẫu nhiên chứ không vét cạn, nên trần giới hạn vẫn là điều kiện dừng ở task T19 — nhưng xác suất bốc trúng cùng một ứng viên hai lần sẽ giảm xuống, khiến `specHash` ít phát hiện trùng lặp hơn và ngân sách tìm kiếm bị phân tán nhiều hơn.

Mọi chiến lược dạng sự kiện (event-style) giờ đây bắt buộc phải tự cài đặt cơ chế suy giảm tín hiệu của chính mình.

Thuộc tính `strength` giờ đây mang hai ý nghĩa cùng lúc — độ tự tin của chiến lược, và độ mới của tín hiệu. Cả hai bản chất đều thể hiện *tiếng nói của tôi đáng giá bao nhiêu ngay lúc này*, nhưng chúng không hoàn toàn đồng nhất.
