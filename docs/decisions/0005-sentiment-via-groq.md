# Phân loại cảm xúc tin tức gọi API Groq, đứng sau interface provider

## Why this (Lý do lựa chọn)

Mục 44 của đề bài nghiêm cấm crawler gọi trực tiếp mô hình AI, và mục 40 đặt ra hai câu hỏi thực chất cùng hướng về một vấn đề: bán kính ảnh hưởng khi có sự cố (blast radius). Cụ thể: nếu service tin tức bị lỗi thì biểu đồ có còn hoạt động không, và nếu mô hình sentiment thay đổi thì engine chiến lược có bị ảnh hưởng không? Những câu hỏi đó nhằm kiểm tra ranh giới kiến trúc chứ không phải cách thức triển khai hạ tầng. Vì vậy, ranh giới là thứ chúng ta tập trung xây dựng: một interface `SentimentProvider` với một phương thức duy nhất, và mọi thành phần phía trên chỉ biết đến interface này.

Đặt Groq phía sau interface đó đồng nghĩa với việc không cần tự host mô hình cục bộ, không cần runtime Python, không cần tải hàng gigabyte model weights về máy của từng thành viên, và không phải đau đầu về bài toán GPU. Toàn bộ dự án tiếp tục đồng nhất bằng TypeScript, giúp package contracts dùng chung bao phủ trọn vẹn mọi tiến trình mà chúng ta chạy.

Yếu tố giúp việc dùng API hosted ở đây trở nên an toàn tuyệt đối là mục 29 của đề bài đã yêu cầu lưu nhãn (label) và điểm số (score) cùng với bài báo vào database. Do đó Groq chỉ được gọi đúng một lần duy nhất cho mỗi bài báo tại thời điểm thu nạp (ingest time) và không bao giờ gọi lại nữa. Các lượt backtest đọc điểm số đã lưu từ database, chiến lược sentiment đọc điểm số đã lưu, và kịch bản demo cũng đọc điểm số đã lưu. Phụ thuộc bên ngoài nằm ở rìa ngoài cùng của hệ thống trên luồng nạp tin tức, hoàn toàn không nằm trên luồng chạy backtest vốn là phần được chấm điểm.

Việc giữ nó đứng sau một interface giúp quyết định này có thể đảo ngược bất cứ lúc nào (reversible). Nếu Groq gặp vấn đề — giới hạn tần suất (rate limits), chi phí, hoặc chất lượng phân tích tiêu đề crypto chưa ưng ý — việc hoán đổi sang một mô hình HuggingFace chạy local hay một nhà cung cấp cloud khác chỉ là thay đổi một provider binding duy nhất, không dòng code nào phía trên interface bị xáo trộn. Đây chính là cơ chế đã áp dụng thành công cho strategy registry và bộ sinh ứng viên tìm kiếm.

## What else we looked at (Các phương án khác đã cân nhắc)

**Tự chạy mô hình HuggingFace cục bộ trong một service Python riêng** — phương án mà thông thường dự án dạng này sẽ chọn mặc định. Nó giữ mọi thứ bên trong hệ thống nội bộ và hoạt động được offline, nhưng cái giá phải trả là thêm một runtime thứ hai, dung lượng model weights nặng nề trên mọi máy phát triển, và một tiến trình bắt buộc phải bật thì pipeline tin tức mới chạy được. Nó cũng biến ngăn xếp công nghệ thành đa ngôn ngữ (polyglot) chỉ vì một service nhỏ.

**Chạy mô hình cục bộ trực tiếp bên trong tiến trình backend** — phương án nhẹ nhất trong các lựa chọn chạy local, nhưng là phương án trượt ngay lập tức các câu hỏi kiểm tra ở mục 40. Việc nạp mô hình chậm sẽ làm chậm quá trình khởi động biểu đồ, và một sự cố crash khi suy luận AI (inference) sẽ đánh sập toàn bộ backend chứ không chỉ riêng tính năng sentiment.

**Một dịch vụ API sentiment thương mại khác** — tương tự như Groq. Groq thắng nhờ độ trễ cực thấp và bản chất là một LLM có thể tinh chỉnh prompt linh hoạt, cho phép cải thiện chất lượng phân loại chỉ bằng cách viết lại prompt thay vì phải huấn luyện lại mô hình.

## Trade-offs (Đánh đổi)

Phân tích cảm xúc giờ đây là một câu prompt gửi tới mô hình của bên thứ ba thay vì một mô hình chúng ta tự kiểm soát và chạy trực tiếp. Mục 2 của đề bài yêu cầu phân tích cảm xúc "sử dụng mô hình học máy", và một giám khảo chấm thi hoàn toàn có thể kỳ vọng nhìn thấy một model file thực tế thay vì một lệnh gọi API. Interface provider chính là câu trả lời kiến trúc chuẩn mực nếu vấn đề này được nêu ra — chúng ta có thể dễ dàng trình diễn một model local đứng sau cùng interface đó — nhưng đây là một điểm cần chuẩn bị sẵn tâm thế phản biện chứ không để bị bất ngờ.

Quy trình nạp tin giờ đây phụ thuộc vào kết nối Internet và API key. Key là một secret bắt buộc phải giữ ngoài git repository, tạo ra một loại tài nguyên nhạy cảm mà dự án phải xử lý đúng quy chuẩn. Và một bài báo bị lỗi phân loại cần có trạng thái rõ ràng — giữ nguyên trạng thái chưa chấm điểm để thử lại sau, tuyệt đối không âm thầm gán nhãn trung tính (neutral), nếu không chiến lược sentiment sẽ vô tình bị sai lệch dữ liệu.

Đầu ra của LLM không có tính tất định tuyệt đối như một bộ phân loại truyền thống. Cùng một tiêu đề có thể nhận về điểm số hơi lệch nhau trong các lần gọi khác nhau, điều này có vẻ đi ngược lại tính tái lập (reproducibility) mà mục 36 đòi hỏi ở backtest. Việc lưu điểm số cố định một lần duy nhất vào database và không bao giờ tính toán lại chính là yếu tố bảo toàn tính tái lập cho backtest, vì vậy quy tắc "lưu ngay khi nạp" là một trụ cột kiến trúc bắt buộc, không chỉ đơn thuần là tối ưu hiệu năng.
