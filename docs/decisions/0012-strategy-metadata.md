# Mọi chiến lược tự mô tả metadata, ba thành phần của hệ thống đọc mô tả đó

## Why this (Lý do lựa chọn)

Có ba vị trí trong hệ thống cần biết một chiến lược là gì trước khi bất kỳ ai có thể sử dụng nó: form cấu hình tham số trong task T14, không gian tìm kiếm trong task T17, và danh sách lựa chọn chiến lược trong task T20. Chúng có thể biết điều đó theo một trong hai cách — ai đó gõ tay thông tin vào cả ba nơi, hoặc chiến lược tự công bố một lần duy nhất và cả ba nơi tự đọc.

Gõ tay vào cả ba nơi chính là biểu hiện của anti-pattern viết cứng chiến lược (hard-coded strategy) mà đề bài liệt kê trong danh sách các lỗi thiết kế ở mục 44, và là điều mà kịch bản mục 41 được viết ra để vạch trần: việc thêm một chiến lược Hỗ trợ/Kháng cự mới sẽ đòi hỏi phải sửa một form nhập liệu, một không gian tìm kiếm và một danh sách chọn, và kịch bản chấm thi sẽ tìm ra cả ba vị trí vi phạm đó chỉ trong vòng một phút.

Vì vậy, một chiến lược sẽ tự khai báo chính mình:

```
id, name, group, params[]
```

cùng với những thông tin mà các quyết định trước đó đã đặt vào cùng vị trí — độ dài warm-up từ ADR `0006`, nhu cầu dữ liệu từ ADR `0008`, phiên bản mã nguồn từ ADR `0009`. Bốn bản ghi ADR giờ đây cùng vận hành trên một bản khai báo duy nhất, đó là lý do nó nên là một bản khai báo thống nhất thay vì bốn quy ước rời rạc.

Một tham số được mô tả cấu trúc gồm `{ name, type, min, max, step, default }`. Form nhập liệu cần `type` và `default` để render thành phần giao diện phù hợp; search engine cần `min`, `max` và `step` để có thể quét duyệt không gian tham số — ví dụ ở mục 15 về các cặp MA ở 10/20, 20/50, 50/200 chính là một dải giá trị được duyệt theo bước nhảy (`step`). Nếu bỏ qua dải giá trị này, search engine sẽ buộc phải tự bịa ra biên giới hạn cho các tham số mà nó hoàn toàn không hiểu bản chất.

Trường `group` là một trong năm nhóm chức năng của mục 17: Trend (Xu hướng), Momentum (Động lượng), Volatility (Biến động), Structure (Cấu trúc thị trường), Information (Thông tin tin tức). Nó nằm trong bản khai báo vì thuật toán tìm kiếm định hướng miền (domain-guided search) trong task T17 được định nghĩa trực tiếp dựa trên các nhóm này: quy tắc *một chiến lược xu hướng + một chiến lược động lượng + một chiến lược cấu trúc* là quy tắc không thể biểu diễn nếu thiếu trường này, và việc cố đoán nhóm từ tên chiến lược chỉ là sự phỏng đoán mò mẫm.

## What else we looked at (Các phương án khác đã cân nhắc)

**Viết cứng danh sách trong từng màn hình** — không cần tốn công xây dựng cơ chế tự động. Phương án này được nêu ở đây chủ yếu để khẳng định nhóm đã xem xét và biết rõ nó sẽ gãy ở đâu, vì một bản ghi không bao giờ nhắc tới phương án hiển nhiên sẽ tạo cảm giác như thể người viết chưa từng nghĩ tới nó.

**Lưu metadata trong file cấu hình riêng hoặc bảng cơ sở dữ liệu** — giúp class chiến lược gọn nhẹ, và cho phép chỉnh dải tham số mà không sửa code. Bị loại bỏ vì nó tạo ra hai thứ bắt buộc phải khớp nhau mà không có gì ràng buộc chúng: file config ghi `period` chạy từ 2 đến 50, nhưng code bên trong đã đổi tên tham số từ tuần trước, và cả trình biên dịch lẫn bài test đều không nhận ra. Đặt trực tiếp trên class giúp bản khai báo nằm ngay cạnh đoạn code mà nó mô tả và luôn đi cùng nhau.

**Tự động suy luận danh sách tham số từ constructor qua kỹ thuật Reflection** — phiên bản không có bất kỳ sự lặp lại nào. Nhưng TypeScript xóa sạch kiểu dữ liệu lúc runtime (type erasure), vì vậy nó đòi hỏi decorators phức tạp, và những phần quan trọng nhất ở đây — dải giá trị min/max và bước nhảy step — vốn dĩ không thể biểu diễn được dưới dạng kiểu dữ liệu TypeScript.

## Trade-offs (Đánh đổi)

Một bản khai báo sai sẽ thất bại trong im lặng. Khai báo `min: 2, max: 50` cho một chỉ báo mà mã nguồn thực tế cần ít nhất 14 cây nến, form nhập liệu vẫn vui vẻ cho người dùng chọn 3, search engine vẫn lãng phí các lượt bốc thăm vào các ứng viên không thể phát ra tín hiệu, và không có cảnh báo nào xuất hiện. Đây là cùng loại rủi ro mà ADR `0008` chấp nhận cho nhu cầu dữ liệu, và nó có cùng giải pháp từng phần: bộ golden test của chiến lược chỉ kiểm tra các giá trị mà tệp fixture mẫu sử dụng.

Các tham số giờ đây xuất hiện hai lần — một lần trong bản khai báo metadata, một lần tại nơi code thực tế đọc chúng — đây là sự trùng lặp mà ADR `0008` đã chấp nhận cho nhu cầu dữ liệu. Đó là cái giá của khả năng tự mô tả (self-description).

Các khoảng min/max ban đầu chỉ là phỏng đoán của người viết, và chất lượng của không gian tìm kiếm phụ thuộc vào các khoảng này nhiều hơn là vào thuật toán tìm kiếm. Không ai biết chắc liệu chúng có phải là các biên giới hạn tối ưu hay không cho đến khi các ứng viên được chấm điểm, và khi đó chúng đã được ghi cứng vào các thử nghiệm đã chạy trong database.
