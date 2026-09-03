# @csl/contracts

Chỉ chứa các định nghĩa kiểu dữ liệu (Types only). Không chứa logic xử lý, không có phụ thuộc bên ngoài (dependencies), không có hành vi lúc chạy (runtime behaviour).

Cả API và ứng dụng web đều import từ package này, do đó bất kỳ thay đổi nào đối với cấu trúc dữ liệu (data shape) sẽ làm gãy quá trình build ngay lập tức ở phía chưa kịp cập nhật — thay vì xuất hiện lỗi âm thầm dưới dạng `undefined` trong lúc demo. Đó là toàn bộ lý do tại sao đây là một package độc lập thay vì sao chép cùng một file thành hai bản nằm ở hai thư mục.

**Những gì thuộc về package này:** Cấu trúc dữ liệu mà mọi module tương tác, cùng tên gọi và payload của các sự kiện luân chuyển trên event bus.
**Những gì không thuộc về package này:** Bất kỳ mã nguồn nào thực hiện tính toán, gọi API lấy dữ liệu hoặc kiểm tra hợp lệ (validation) với cơ sở dữ liệu.

## Các cấu trúc dữ liệu (The shapes)

- `market`: Dữ liệu nến (candles) và các khung thời gian (timeframes).
- `signal`: Định dạng tín hiệu mà một chiến lược trả về.
- `strategy`: Cách một chiến lược tự mô tả metadata và những dữ liệu mà nó được phép truy cập.
- `candidate`: Cấu hình một tổ hợp chiến lược ứng viên trong quá trình luân chuyển.
- `dataset`: Dữ liệu chuẩn để một lượt kiểm thử lịch sử đối chiếu đánh giá.
- `experiment`: Các giao dịch thực thi, chỉ số hiệu suất và bản ghi kết quả của một lượt chạy.
- `news`: Các bài báo thu thập được và kết quả phân loại cảm xúc.
- `events`: Danh sách chín sự kiện nội bộ và nội dung payload của từng sự kiện.

## Hai thành phần nằm ngoài package này

**Băm dữ liệu (Hashing).** `CandidateMember.paramsHash` và `Experiment.specHash` là các trường định nghĩa ở đây nhưng logic tính toán băm thì không: thứ tự các thành viên, thứ tự các khóa thuộc tính, chuẩn hóa trọng số và độ chính xác số thực (float precision) phải được thống nhất trước, và đó là logic thực thi. Nó thuộc về nơi viết search engine, tại một vị trí duy nhất, bởi vì nếu hai cài đặt khác nhau sinh ra mã băm khác nhau thì cùng một ứng viên sẽ bị coi là hai thực thể khác biệt và bị test lặp lại hai lần.

**Kiểm tra tính hợp lệ (Validation).** Một bản đặc tả ứng viên nhận từ hàng đợi sẽ không có kiểu dữ liệu lúc runtime (untyped), và việc ép kiểu kiểu TypeScript không kiểm tra được gì trong thực tế. Trình validator thực tế kiểm tra tính hợp lệ nằm ở phía API và phải được duy trì đồng bộ thủ công với các kiểu dữ liệu tại đây. Có ba quy tắc validator kiểm tra mà TypeScript không thể biểu diễn qua hệ thống kiểu: trọng số phải lớn hơn 0, trọng số nằm trên lưới bước nhảy 0.1, và tổng trọng số của toàn bộ đặc tả phải bằng đúng 1.

## Những điểm còn để mở

`BacktestRules` cố định cấu trúc dữ liệu, không ấn định con số cụ thể. Giá vào lệnh nào, mức phí bao nhiêu, thời gian warm-up bao lâu, tính lời lỗ cộng dồn hay lãi kép, đo lường mức sụt giảm (drawdown) tại giá đóng cửa hay từng nến — đó là quyết định của cả nhóm, và theo [ADR 0010](../../docs/decisions/0010-dataset-carries-the-backtest-rules.md), chúng được chọn một lần trước khi bản ghi dataset đầu tiên được tạo. Không có gì trong package này phải chờ đợi các giá trị đó; chỉ có task T12 mới cần đến.
