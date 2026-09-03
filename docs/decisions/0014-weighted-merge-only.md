# Các tín hiệu chỉ được kết hợp thông qua tính điểm có trọng số (weighted score)

## Why this (Lý do lựa chọn)

Ba chiến lược cùng quan sát một cây nến: MA báo Mua, RSI báo Bán, Hỗ trợ/Kháng cự báo Mua. Tổ hợp chiến lược bắt buộc phải đưa ra một câu trả lời duy nhất.

Mục 13 của đề bài nêu ra cơ chế đếm phiếu biểu quyết (vote counting) và mục 14 mô tả chi tiết phương án kết hợp có trọng số (weighted alternative): mã hóa mua là +1 và bán là -1, nhân với trọng số của từng chiến lược, cộng dồn lại, và so sánh với một ngưỡng quyết định (threshold). Mục 14 bắt buộc phải có dạng tính điểm có trọng số và bắt buộc công thức tính phải được viết ra thành văn bản, vì vậy phương án có trọng số là không thể thiếu.

Câu hỏi đặt ra là liệu có nên hỗ trợ song song cả cơ chế đếm phiếu biểu quyết hay không, và câu trả lời là không. ADR `0006` đã quyết định tín hiệu mang theo độ mạnh (strength) để điểm sentiment ví dụ 0.82 không bị làm phẳng thô bạo thành chữ `BUY`. Cơ chế đếm phiếu sẽ vứt bỏ con số độ mạnh đó ngay khoảnh khắc kết hợp, khiến báo cáo mô tả một phép kết hợp có trọng số trong khi code thực tế lại không làm như vậy. Việc hỗ trợ cả hai quy tắc sẽ dẫn đến việc một quy tắc dùng độ mạnh còn một quy tắc vứt bỏ độ mạnh, không có cách nào so sánh trung thực kết quả của chúng trên cùng một bảng xếp hạng leaderboard.

Vì vậy, mỗi thành viên đóng góp giá trị bằng `direction × strength × weight`, và tổng điểm sẽ quyết định hành động:

```
|score| > threshold   →  hành động theo dấu (dương: BUY, âm: SELL)
ngược lại              →  HOLD (giữ nguyên)
```

Một công thức duy nhất bao quát cả hai chiều mua bán, và phép so sánh là nghiêm ngặt (`>`) — một điểm số rơi trúng vào ngưỡng vẫn được coi là nằm ở ranh giới chưa dứt khoát, đúng như định nghĩa bản chất của ngưỡng threshold.

**Điểm số được làm tròn đến 6 chữ số thập phân trước khi so sánh.** Nếu không làm tròn, việc điểm số "bằng" ngưỡng hay không sẽ bị chi phối bởi sai số dấu phẩy động nhị phân: phép tính `0.5 - 0.2` trong JavaScript cho ra `0.30000000000000004`, khiến cho cùng một tình huống logic — sự đồng thuận rơi đúng vào ranh giới ngưỡng — lại xử lý khác nhau tùy thuộc vào những trọng số nào vô tình tạo ra nó. Làm tròn 6 chữ số thập phân là quy ước thống nhất với ADR `0009`.

**Độ mạnh của chính tổ hợp là `|score|`.** Bản thân một tổ hợp chiến lược cũng là một chiến lược và phải trả về độ mạnh như mọi chiến lược khác. Điểm số vốn đã nằm trong đoạn -1..1 và thể hiện rõ mức độ đồng thuận của cả nhóm, vì vậy không cần bịa thêm công thức mới, và một tổ hợp lồng bên trong một tổ hợp khác (composite nested inside composite) sẽ tự động hoạt động mà không cần thêm quy tắc bổ sung.

Ba thuộc tính của trọng số được quy định chặt chẽ để ngăn chặn các lỗi âm thầm:

**Tổng trọng số bằng đúng 1.** Ngưỡng threshold bắt buộc phải giữ nguyên ý nghĩa bất kể ứng viên được cấu thành từ bao nhiêu chiến lược con. Nếu không chuẩn hóa, 2 thành viên đồng thuận cho ra điểm 2 trong khi 5 thành viên đồng thuận cho ra điểm 5, khiến cho ngưỡng cố định càng dễ vượt qua khi càng nhồi thêm nhiều chiến lược và bảng xếp hạng sẽ bị tràn ngập bởi các tổ hợp cồng kềnh vì một lý do không ai nhìn thấy được.

**Trọng số phải lớn hơn 0 nghiêm ngặt.** Một thành viên có trọng số bằng 0 không đóng góp gì, khiến ứng viên đó hoạt động hoàn toàn y hệt như một ứng viên nhỏ hơn không chứa nó — làm một chiến lược chiếm hai dòng dữ liệu và tốn hai lượt backtest vô ích.

**Trọng số nằm trên lưới bước nhảy 0.1.** Trọng số liên tục vô hạn sẽ khiến mỗi lượt bốc thăm sinh ra một mã băm khác nhau, cơ chế phát hiện trùng lặp không bao giờ kích hoạt và bảng xếp hạng sẽ bị ngập trong các dòng kết quả chỉ lệch nhau ở số thập phân thứ tư. Với bước nhảy 0.1 và trọng số lớn hơn 0, có 9 bộ trọng số khả dĩ cho 2 thành viên, 36 bộ cho 3 thành viên, và 84 bộ cho 4 thành viên.

## What else we looked at (Các phương án khác đã cân nhắc)

**Đưa biểu quyết đa số (majority vote) làm quy tắc thứ hai** — chính đề bài đã gợi ý trong mục 13, nên việc bỏ qua nó cần phải được giải thích rõ. Nó đơn giản hơn và báo cáo có thể tuyên bố hệ thống hỗ trợ nhiều quy tắc kết hợp. Nhưng nó thua ở bài toán độ mạnh tín hiệu, và kết quả của hai quy tắc trên cùng một bảng xếp hạng không thể so sánh tương đương được với nhau, dẫn đến việc bảng xếp hạng sẽ âm thầm trộn lẫn hai bản chất dữ liệu khác nhau. Việc thêm quy tắc này sau này chỉ là thêm một phần tử vào mảng.

**Trọng số tự thích ứng dựa trên hiệu suất quá khứ** — cho phép các chiến lược có điểm số cao hơn tự động nhận trọng số lớn hơn. Rất hấp dẫn và là điều mà một bộ sinh học máy sẽ làm. Nhưng nó thuộc về trách nhiệm của generator và lịch sử của nó (ADR `0013`), không thuộc về logic kết hợp tín hiệu: làm điều đó bên trong tổ hợp sẽ khiến hành vi của một ứng viên phụ thuộc vào những lượt chạy nào diễn ra trước nó, khiến cùng một ứng viên sẽ đạt điểm khác nhau tùy vào thứ tự tìm kiếm.

**Trọng số là các số thực tự do** — không gian tìm kiếm rộng nhất, nhưng biến `specHash` thành vô dụng vì không có gì lặp lại.

## Trade-offs (Đánh đổi)

Chỉ có một quy tắc kết hợp duy nhất, vì vậy khả năng hoán đổi quy tắc chỉ là khẳng định trên lý thuyết chứ chưa được chứng minh bằng code chạy thực tế. Thêm một giá trị thứ hai chỉ tốn một phần tử mảng, nhưng chừng nào chưa có giá trị thứ hai thì chưa ai chứng minh được ranh giới kỹ thuật này hoàn toàn đứng vững.

Lưới bước nhảy 0.1 không thể biểu diễn một giá trị tối ưu thực sự như 0.37. Chúng ta đang đặt cược rằng khoảng chênh lệch đó nhỏ hơn độ nhiễu của một lượt backtest.

Việc chuẩn hóa trọng số đồng nghĩa với việc người dùng gõ 2, 1, 1 sẽ thấy hệ thống lưu và hiển thị là 0.5, 0.25, 0.25 — những con số họ thấy không phải là những con số họ đã gõ vào. Việc này bắt buộc phải diễn ra trước khi băm, nếu không một ứng viên sẽ xuất hiện dưới hai mã định danh khác nhau.
