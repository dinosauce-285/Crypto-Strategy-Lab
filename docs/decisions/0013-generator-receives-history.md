# Bộ sinh ứng viên nhận lịch sử các vòng chạy trước để tránh lặp lại

## Why this (Lý do lựa chọn)

Phương thức `generate()` có nhiệm vụ sinh ra ứng viên tiếp theo để kiểm thử. Bản cài đặt đầu tiên là thuật toán ngẫu nhiên (random) — chọn ngẫu nhiên một vài chiến lược, chọn ngẫu nhiên các con số trong dải tham số đã khai báo, và trả về tổ hợp đó — và thuật toán ngẫu nhiên thì không cần gì ngoài metadata của ADR `0012`. Nhìn vào riêng nó thì chữ ký hàm không cần truyền vào bất kỳ lịch sử nào.

Lập luận để bắt buộc truyền lịch sử vào chữ ký hàm bắt nguồn từ mục 42 của đề bài, mục này đặt ra kịch bản kiểm tra rõ ràng: thay thế bộ sinh ứng viên bằng một thuật toán khác và xem các phần còn lại của hệ thống phải thay đổi bao nhiêu. Mọi bộ sinh ứng viên nâng cao hơn thuật toán ngẫu nhiên — giải thuật di truyền (genetic), tối ưu hóa Bayesian, thuật toán tiến hóa — đều hoạt động bằng cách nhìn vào những gì đã được thử nghiệm trước đó và điểm số của chúng ra sao. Nếu chữ ký hàm ban đầu không nhận tham số nào, thì ngày một thuật toán như vậy được viết ra cũng chính là ngày interface chung bị thay đổi, và interface đó chính là ranh giới kỹ thuật mà kịch bản chấm thi đang đo lường. Thêm một tham số chưa dùng chỉ tốn đúng một dòng code; nhưng việc phải sửa ranh giới interface sẽ làm mất đi câu trả lời hoàn hảo cho câu hỏi kiểm tra.

Vì vậy chữ ký hàm nhận vào lịch sử, và bộ sinh ngẫu nhiên chỉ đơn giản là bỏ qua nó. Câu nói đó cũng chính là minh chứng: một bộ sinh không quan tâm đến lịch sử sẽ không bị ảnh hưởng bởi sự hiện diện của tham số đó, điều này giúp việc bổ sung nó trở nên an toàn trước khi có người thực sự cần đến.

Dữ liệu lịch sử được giới hạn ở mức tối giản nhất có thể nhưng vẫn đủ hữu ích: **danh sách các ứng viên đã được kiểm thử, kèm điểm số của chúng**. Không phải là trạng thái tìm kiếm phức tạp, không phải bộ đếm thế hệ, không phải ngân sách thời gian đã tiêu tốn — những thứ đó chỉ là phỏng đoán về một thuật toán chưa ai viết, và một phỏng đoán bị đóng cứng vào shared type còn tệ hơn là việc thiếu nó.

## What else we looked at (Các phương án khác đã cân nhắc)

**Hàm `generate()` không nhận tham số** — không có tham số thừa, không suy đoán viển vông, và trung thực với những gì thuật toán ngẫu nhiên thực sự cần. Nó thua ở thời điểm: thay đổi mà nó trì hoãn là thay đổi đối với một shared interface dùng chung, diễn ra muộn hơn, tại đúng ranh giới mà mục 42 thanh tra. Trì hoãn chi phí không làm giảm chi phí; nó chỉ chuyển chi phí tới thời điểm đắt đỏ hơn.

**Cung cấp cho generator một repository để nó tự query bất kỳ thứ gì nó muốn** — linh hoạt tối đa và không bao giờ phải sửa lại interface. Nhưng nó đẩy một thành phần vốn chỉ nên tập trung suy nghĩ về tổ hợp chiến lược quay trở lại việc chạm tay vào tầng lưu trữ database, vốn là anti-pattern mà mục 44 nêu tên và ADR `0008` đã tốn công loại bỏ. Lập luận tương tự phải được áp dụng nhất quán ở đây.

**Một đối tượng trạng thái tìm kiếm đồ sộ — kích thước quần thể, số thế hệ, thời gian đã trôi qua, ngân sách còn lại** — chuẩn bị quá đà cho giải thuật di truyền. Mỗi trường dữ liệu là một canh bạc về cách một thuật toán chưa viết sẽ được cấu trúc, và một canh bạc sai không hề miễn phí: nó nằm trong package contracts dùng chung và mọi bộ sinh đều bắt buộc phải chấp nhận nó.

## Trade-offs (Đánh đổi)

Có một tham số chưa được dùng trong code ngay từ ngày đầu. Nó trông có vẻ suy đoán viển vông, và thứ duy nhất bảo vệ nó là bản ghi ADR này giải thích lý do — đây chính là thứ mà người đọc code sẽ tưởng là tai nạn vô ý nếu thiếu bản ghi này.

Cấu trúc của lịch sử là một phỏng đoán khi chưa có bên tiêu thụ thực tế. Một bộ sinh di truyền có thể muốn có liên kết cha-con (parent links) hoặc đánh số thế hệ, và việc bổ sung những thứ đó sau này sẽ lại là thay đổi đối với chính interface mà quyết định này muốn bảo vệ. Những gì chúng ta đạt được là bộ sinh nâng cao *đầu tiên* sẽ không ép đổi interface; chúng ta không mua được sự miễn nhiễm tuyệt đối.

Việc truyền toàn bộ mọi ứng viên đã test sẽ không chịu nổi khi số lượng lên tới 10.000 ứng viên. Dữ liệu lịch sử bắt buộc phải là một góc nhìn có giới hạn (bounded view) — top N cá thể dẫn đầu kèm số đếm, hoặc cơ chế phân trang — thay vì toàn bộ danh sách, và chi tiết này được giao lại cho task T17 xử lý.
