# Tập hợp khung thời gian bao quát mọi ví dụ trong bản mô tả yêu cầu

## Why this (Lý do lựa chọn)

Bản mô tả yêu cầu (brief) nhắc đến các khung thời gian ba lần và mỗi lần trong số đó đều mang tính chất minh họa.

Section 3 hướng dẫn người dùng qua việc hoán đổi từng biểu đồ — `5m → 1m`, `15m → 30m`, `1h → 2h`, `4h → 1d` — để làm rõ quan điểm rằng việc thay đổi một biểu đồ không làm tải lại toàn bộ hệ thống. Section 4 liệt kê sáu khung thời gian dưới mục `Ví dụ:` trong khi mô tả dữ liệu lịch sử dùng để làm gì. Section 5 vẽ bộ chọn dưới dạng `[1m] [5m] [15m] [1h] [4h] [1d]`, cũng dưới mục `Ví dụ:`, đồng thời nêu rõ mỗi biểu đồ phải có khả năng thay đổi khung thời gian của chính nó.

Không có nơi nào bản mô tả chỉ định tập hợp này là một đặc tả cố định. Mọi đề cập đều nằm sau từ "ví dụ", và mỗi lần đều nhằm làm rõ một điểm khác — hoán đổi nóng, lưu trữ, tính độc lập theo từng biểu đồ.

Điều đó rất quan trọng vì nó xóa bỏ câu hỏi mà bản ghi quyết định này ban đầu cố gắng trả lời. Không hề có mâu thuẫn nào cần phân xử và không cần quyết định xem section nào có thứ bậc cao hơn section nào. Sáu khung thời gian thỏa mãn Section 4 và 5 nhưng khiến ví dụ của Section 3 không thể thực hiện được. Tám khung thời gian thỏa mãn cả ba, vì sáu khung kia là tập con của tám khung: mọi bộ chọn mà bản mô tả vẽ ra đều vẫn có thể vẽ được, và việc hoán đổi mà Section 3 mô tả thực sự có thể thực hiện được.

Vì vậy tập hợp là `1m, 5m, 15m, 30m, 1h, 2h, 4h, 1d` — tập hợp nhỏ nhất bao quát mọi ví dụ mà bản mô tả đưa ra. Cả hai giá trị mới đều là các interval hợp lệ của Binance, và các adapter truyền khung thời gian qua tham số truy vấn `interval` một cách nguyên vẹn, do đó không có gì phải tự tính xem một cây nến `30m` kéo dài bao lâu. Hai nơi ánh xạ mọi khung thời gian thành một số là `Record<Timeframe, …>`, vì vậy trình biên dịch sẽ chỉ rõ chúng thay vì để một trường hợp nào bị bỏ sót một cách âm thầm.

## What else we looked at (Các phương án khác đã cân nhắc)

**Chỉ triển khai sáu khung và coi Section 3 là một mâu thuẫn cần lưu ý trong báo cáo** — cách hiểu mà bản ghi quyết định này ban đầu theo đuổi, và nó đã sai đến hai lần. Nó bỏ lỡ việc Section 4 cũng liệt kê sáu khung, vì vậy tỷ số chưa bao giờ là hòa 1-1 như đã lập luận. Quan trọng hơn, nó đã coi danh sách của Section 5 như một đặc tả cứng trong khi dòng ngay phía trên nó ghi rõ `Ví dụ:`. Khi đã quyết định rằng có mâu thuẫn tồn tại, sau đó nó phải tuyên bố Section 5 viết sai về hệ thống — một câu văn sẽ phải viết vào báo cáo và bảo vệ công khai, được phát minh hoàn toàn để biện minh cho một xung đột vốn không hề có. Không có điều gì ở tám khung thời gian mâu thuẫn với một ví dụ chỉ hiển thị sáu khung.

**Bổ sung mọi interval của Binance** — từ `3m` đến `1M`, tất cả mười lăm khung, miễn phí ở tầng adapter. Nhưng không hề miễn phí ở nơi quan trọng: mỗi khung trở thành một nút bấm trong bộ chọn, một hàng trong mỗi `Record<Timeframe, …>`, và một phân vùng lịch sử nến với đợt backfill riêng. Một bộ chọn với mười lăm tùy chọn trả lời câu hỏi "tôi đang xem biểu đồ nào" kém hơn nhiều so với bộ chọn có tám tùy chọn, và trực giác của Section 5 trong việc giữ cho tập hợp ngắn gọn là đúng đắn ngay cả khi danh sách của nó chỉ là một ví dụ.

**Cho phép cấu hình tập hợp khung thời gian** — đọc nó từ biến môi trường để nó không còn là một hợp đồng cứng. Điều này di chuyển sự lựa chọn vào một nơi không ai xem xét và phá hủy điều làm cho `Timeframe` đáng giá: một kiểu union mà trình biên dịch có thể kiểm tra toàn diện. Một tập hợp có thể cấu hình là một `string`, và một `string` chính là cách mà một biểu đồ kết thúc bằng việc yêu cầu Binance một interval không hề tồn tại.

## Trade-offs (Đánh đổi)

Tám khung thời gian là tám phân vùng lịch sử nến thay vì sáu, mỗi phân vùng được backfill độc lập trong lần đầu sử dụng. Không có gì hiện tại bị chậm đi; điều thay đổi là có thêm hai phân vùng có thể được tạo ra, vì vậy một người dùng xem cả tám khung sẽ lưu trữ nhiều hơn một phần ba so với người chỉ xem sáu khung — cho hai khung thời gian có thể không bao giờ được nhấp vào.

`Timeframe` là một hợp đồng mà cả hai ứng dụng đều import, và việc mở rộng một union chỉ an toàn theo một hướng. Mọi dữ liệu đã lưu trữ vẫn giữ nguyên giá trị hợp lệ, và hai bảng ánh xạ toàn diện là các `Record`, do đó trình biên dịch đã bắt được chúng. Bất cứ thứ gì trước đây xử lý cả sáu khung theo cách khác — một khối `switch`, một chuỗi so sánh — giờ đây sẽ có một trường hợp không được xử lý và không có lỗi biên dịch nào cảnh báo. Hiện tại không có đoạn mã nào như vậy; đoạn này là lời cảnh báo cho đoạn mã tiếp theo.

Bộ chọn giờ đây hiển thị tám nút bấm nơi ví dụ của bản mô tả chỉ vẽ sáu, và ai đó sẽ thắc mắc tại sao. Câu trả lời là Section 3, đó là một câu trả lời tốt và vẫn là một câu hỏi cần phải được giải đáp. Một bộ chọn ngắn hơn sẽ dễ đọc hơn, và hai trong số tám nút này tồn tại chỉ để thỏa mãn bốn dòng của một ví dụ minh họa chứ không phải vì có ai đó yêu cầu giao dịch trên nến 2 giờ.
