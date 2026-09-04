# Một search run phải khai báo giới hạn dừng trước khi bắt đầu

## Why this (Lý do lựa chọn)

Mục 23 của đề bài yêu cầu bắt buộc phải có điều kiện dừng và từ chối mọi vòng lặp `while(true)` không kiểm soát. Điều kiện đó được thiết kế như sau: một lượt chạy mang theo giới hạn dừng (bound) dưới dạng dữ liệu được truyền vào ngay lúc khởi động, và bất kỳ yêu cầu nào không khai báo giới hạn sẽ bị từ chối thẳng thừng thay vì tự gán một giá trị mặc định. Một lượt chạy có thể bị giới hạn bởi số lượng ứng viên tối đa (`maxCandidates`), theo thời lượng đồng hồ đếm ngược (`maxDurationMs`), hoặc cả hai, và nó sẽ dừng ngay khoảnh khắc điều kiện đầu tiên trong số đó được thỏa mãn.

Việc từ chối yêu cầu thiếu bound là mấu chốt của vấn đề. Một giới hạn mặc định ngầm định thực chất không khác gì không có giới hạn — không ai để ý đọc giá trị mặc định, nên con số làm dừng lượt chạy là con số không ai chủ động chọn. Việc từ chối yêu cầu biến việc khai báo ngân sách tìm kiếm thành một hành động có ý thức, và biến tính chất "hệ thống này không thể chạy một vòng lặp vô tận" thành một thuộc tính cứng của bề mặt API có thể kiểm chứng trong 30 giây, thay vì chỉ là một thói quen không thể chứng minh.

Đặt giới hạn gắn liền với từng lượt chạy thay vì trong file cấu hình bắt nguồn từ mục đích của lượt chạy: Một lượt thử 200 ứng viên để kiểm tra luồng pipeline có chạy thông suốt hay không và một lượt chạy qua đêm quét qua dữ liệu lịch sử một năm là cùng một cỗ máy nhưng trả lời hai câu hỏi hoàn toàn khác nhau. Đưa một con số vào biến môi trường sẽ cào bằng chúng thành cùng một lượt chạy và bắt ai muốn đổi phải sửa file cấu hình triển khai hệ thống.

Có thêm hai lý do dừng khác không phải do người gọi khai báo: Lượt chạy dừng khi bộ sinh ứng viên cạn kiệt không gian tham số, và lượt chạy dừng khi có người dùng chủ động bấm nút dừng (stop). Một lượt chạy cũng có thể khai báo thêm ngưỡng bão hòa (plateau limit) — số ứng viên liên tiếp thất bại trong việc vượt qua kết quả tốt nhất trước đó.

Dù dừng vì lý do gì, lượt chạy bắt buộc phải báo cáo rõ lý do đó. Mục 32.7 hỏi vòng lặp có đang chạy hay không, và một lượt chạy chỉ hiển thị vỏn vẹn "không chạy" sẽ không thể phân biệt được với một tiến trình bị sập đột ngột. Báo cáo lý do dừng giúp việc dừng lại trở nên minh bạch và chỉ tốn một chuỗi string.

## What else we looked at (Các phương án khác đã cân nhắc)

**Giới hạn cố định trong file cấu hình** — một biến `MAX_CANDIDATES` đọc từ môi trường và kiểm tra trong vòng lặp. Nó thỏa mãn câu chữ của mục 23 với chi phí một dòng code, nhưng giới hạn khi đó không còn là câu trả lời cho câu hỏi "chúng ta chi bao nhiêu ngân sách cho thử nghiệm này" mà biến thành chi tiết triển khai kỹ thuật; hai lượt chạy trên cùng một máy không thể khác nhau.

**Chỉ dừng lại khi kết quả không còn cải thiện (Plateau-only)** — điều kiện mà một thuật toán tìm kiếm *nên* có, nhưng không thể là điều kiện dừng duy nhất vì nó phụ thuộc vào công thức tính điểm và một bộ sinh liên tục sinh ra các ứng viên gần giống nhau có thể cải thiện điểm số ở mức sai số làm tròn vô tận, biến thành một vòng lặp vô tận có văn hóa hơn.

**Không cần điều kiện dừng — người dùng tự quan sát và bấm dừng** — mục 23 thẳng thừng từ chối cách này, và rủi ro nó mang lại là có thật: một lượt chạy không ai bấm dừng vào chiều thứ Sáu sẽ ngốn sạch tài nguyên cả kỳ nghỉ cuối tuần.

## Trade-offs (Đánh đổi)

Giới hạn là một phỏng đoán đưa ra trước khi có dữ liệu thực tế. Một lượt chạy suýt chút nữa đã tìm ra ứng viên tốt nhất ở vị trí 201 sẽ bị dừng lại ở số 200 và hệ thống không bao giờ nhắc tới điều đó. Đổi lại, không có lượt chạy nào sống dai hơn sự chú ý của người đã bật nó lên.

Mọi bên gọi API giờ đây bắt buộc phải cung cấp một con số giới hạn, bao gồm cả lệnh demo gõ từ terminal và màn hình ở task T20. Không thể khởi chạy một lượt tìm kiếm chỉ bằng một cú nhấp chuột mà không điền bất kỳ thông tin nào.

*(Được làm rõ và điều chỉnh bởi ADR 0045)*: Thời gian tạm dừng (paused time) giờ đây không bị trừ vào ngân sách thời gian hoạt động thực tế `maxDurationMs`, và trạng thái tạm dừng được kiểm soát bằng một khóa lease có thời hạn tự động giải phóng.
