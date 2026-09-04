# Vùng hỗ trợ/kháng cự xác định từ các cụm pivot có xác nhận nhân quả

## Why this (Lý do lựa chọn)

Mục 10 của đề bài nêu rõ việc phát hiện vùng giá hỗ trợ/kháng cự "tùy thuộc vào thuật toán" — đề bài không đưa ra công thức cố định, khác với MA, RSI và Bollinger Bands vốn là các công thức toán học chuẩn mực trong sách giáo khoa. Codebase này cần một câu trả lời thực tế duy nhất, và nó bắt buộc phải thỏa mãn ràng buộc của ADR `0008`: một lượt backtest tuyệt đối không bao giờ được đọc cây nến nằm sau cây nến nó đang đứng (không nhìn trước tương lai).

Thuật toán được chọn: Một cây nến `i` được coi là một đáy xoay chiều (pivot low) nếu giá thấp nhất `low` của nó là nhỏ nhất trên cửa sổ đối xứng `[i-lookback, i+lookback]` (tương tự với đỉnh xoay chiều pivot high dựa trên giá cao nhất `high`); tham số `lookback` có giá trị mặc định là 5. Một pivot tại nến `i` không thể được xác định cho đến khi có đủ `lookback` cây nến phía bên phải xuất hiện, vì vậy nó **chỉ bắt đầu được sử dụng kể từ index `i+lookback`** — tuyệt đối không bao giờ được dùng tại chính nến `i`. Độ trễ xác nhận (confirmation delay) này chính là yếu tố giúp phương pháp hình học fractal tuân thủ luật nhân quả nghiêm ngặt: cây nến N chỉ được dùng dữ liệu đã diễn ra tính đến cây nến N. Các mức pivot low đã được xác nhận nằm trong khoảng chênh lệch `mergeThresholdPct` (mặc định 0.5%) sẽ được gộp cụm thành một vùng hỗ trợ duy nhất, có giá trị bằng trung bình cộng của các mức giá trong cụm; các pivot high được gom cụm tương tự thành các vùng kháng cự. Tại mỗi index, `support[N]` là vùng hỗ trợ gần nhất nằm tại hoặc dưới mức giá `close[N]` trong số các vùng đã được xác nhận trước hoặc tại nến `N` (trả về `NaN` nếu chưa có vùng nào); `resistance[N]` là vùng kháng cự gần nhất nằm tại hoặc trên mức giá đó.

Cơ chế này cung cấp cho hai chuỗi dữ liệu trong `DataRequest` đã chốt ở ADR `0028` (`support-resistance.support` và `.resistance`) một nguồn dữ liệu tất định, cụ thể và có thể tái lập lại được — cùng các cây nến đó sẽ luôn sinh ra cùng các vùng giá đó, đáp ứng trọn vẹn yêu cầu tái lập của ADR `0008`.

## What else we looked at (Các phương án khác đã cân nhắc)

**Lấy giá trị Min/Max trượt trên N cây nến (Rolling min/max)** — cách hiểu đơn giản nhất về "hỗ trợ và kháng cự", không cần pivot, không gom cụm. Bị loại bỏ vì đây không phải là phát hiện vùng giá thực sự: mức giá khi đó luôn là mức cực trị gần nhất thay vì một mức giá mà thị trường thực sự đã kiểm định nhiều lần (revisited), khiến chiến lược phản ứng với độ nhiễu ngắn hạn thay vì cấu trúc thị trường thực tế.

**Biểu đồ phân phối khối lượng Volume Profile / Price-bucket histogram** — gom các mức giá đóng cửa vào các thùng và lấy các thùng có khối lượng dày đặc nhất làm vùng giá. Bị trì hoãn vì trường `Candle.volume` đơn thuần không phân bổ chi tiết các mức giá bên trong cây nến như high/low, và nó đòi hỏi thêm tham số độ rộng thùng (bucket width) mà không đem lại lợi ích vượt trội rõ ràng trong phạm vi đồ án.

**Không có độ trễ xác nhận — coi pivot đã biết ngay tại index của chính nó** — đơn giản hơn, bớt một khái niệm phải giải thích. Nhưng đây chính là lỗi thiên kiến nhìn trước tương lai (lookahead bias) nghiêm trọng mà ADR `0008` sinh ra để triệt tiêu: một đáy pivot chỉ trở thành đáy xoay chiều khi các cây nến tương lai đã hình thành và quay đầu đi lên, vì vậy việc dùng nó ngay tại cây nến của chính nó đồng nghĩa với việc chiến lược đã biết trước hình hài tương lai của biểu đồ.

## Trade-offs (Đánh đổi)

Việc tra cứu vùng giá gần nhất là một vòng quét tuyến tính qua các vùng đã được xác nhận tại mỗi index — độ phức tạp `O(candles × zones)`. Điều này được chấp nhận vì kiến trúc là thứ được chấm điểm chứ không phải vi tối ưu thuật toán, và việc chuẩn bị chỉ báo chưa từng là điểm nghẽn hiệu năng.

Tham số `lookback` và `mergeThresholdPct` là các giá trị phỏng đoán mặc định chưa qua chứng minh toán học, tương tự như các con số chưa thể biện minh của ADR `0015`.

Một vùng giá chỉ được hình thành từ các điểm pivot xoay chiều rõ nét, vì vậy một vùng giá đi ngang phẳng tích lũy (flat consolidation) hoặc một cây nến có bấc quét mạnh rồi rút chân trong một nến sẽ không được nhận diện bởi phương pháp này. Đó là sự đánh đổi có ý thức để giữ cho thuật toán đủ đơn giản, dễ giải thích và chứng minh được tính nhân quả.
