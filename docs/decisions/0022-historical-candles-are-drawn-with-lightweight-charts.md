# Biểu đồ nến được vẽ bằng thư viện TradingView Lightweight Charts

## Why this (Lý do lựa chọn)

Dữ liệu nến khi truyền về đã có cấu trúc định hình sẵn cho biểu đồ tài chính — `Candle` mang theo cặp coin, khung thời gian, thời gian mở nến và các mức giá OHLC dưới dạng chuỗi số thập phân. Yêu cầu hoàn thành của task T06 nêu rõ màn hình phải hiển thị biểu đồ nến Nhật (candlestick chart), không phải biểu đồ đường hay cột thông thường, và `apps/web/docs/UI_CONSTRAINT.md` cố định thư viện được chọn ở đây là thư viện biểu đồ duy nhất cho toàn bộ ứng dụng: dashboard 4 biểu đồ của T08 và các biểu đồ đường cong vốn chủ sở hữu (equity curve) sau này đều phải kế thừa nó thay vì tự chọn thư viện khác.

Frontend chỉ render những gì backend đã tính toán và tuyệt đối không tự tính toán logic (Quy tắc bất khả xâm phạm số 5, `UI_CONSTRAINT.md`). Một thư viện đã biết sẵn cách vẽ nến — thân nến, bấc nến, màu xanh tăng / đỏ giảm — giúp bảo toàn ranh giới kiến trúc đó. Nếu tự vẽ hình học cây nến trên một thư viện đồ họa nguyên thủy thông thường đồng nghĩa với việc phải viết logic biểu đồ bên trong React component, vốn chính là anti-pattern cần tránh.

Thư viện `lightweight-charts` (TradingView, giấy phép mã nguồn mở MIT, dung lượng ~45KB gzipped) cung cấp cả chuỗi nến candlestick lẫn chuỗi đường/vùng line/area trong cùng một package: T06 cần chuỗi nến, và các màn hình sau này (đường cong vốn T14, kết quả tìm kiếm T20) có thể tái sử dụng cùng pattern mà không cần cài thêm dependency thứ hai. Thư viện này vẽ trên nền HTML5 Canvas, vì vậy 1000 cây nến mỗi cặp coin mà ADR `0023` nạp bù có thể render và cuộn pan mượt mà mà không phải chịu chi phí DOM node nặng nề như các thư viện render từng cây nến bằng phần tử SVG, điều này cực kỳ quan trọng khi task T08 đặt cùng lúc 4 biểu đồ trên một màn hình.

## What else we looked at (Các phương án khác đã cân nhắc)

**Các thư viện biểu đồ thông dụng (Recharts, hoặc thư viện nguyên thủy như visx)** — linh hoạt cho biểu đồ đường và cột, nhưng không thư viện nào hỗ trợ sẵn chuỗi nến tài chính OHLC. Tự vẽ thân nến và bấc nến đồng nghĩa với việc đưa logic vẽ hình học vào React. Nó cũng dẫn đến việc sau này phải chọn thêm một thư viện thứ hai khác loại, vi phạm quy tắc "chỉ dùng duy nhất một thư viện biểu đồ" của `UI_CONSTRAINT.md`.

**Chart.js kết hợp plugin tài chính (`chartjs-chart-financial`)** — gần gũi hơn, nhưng loại biểu đồ nến nằm trong một plugin cộng đồng có mức độ duy trì thấp hơn nhiều so với thư viện lõi, và cơ chế render bên dưới vẫn là DOM/SVG cho từng điểm dữ liệu — chi phí rất đắt đỏ khi hiển thị hơn 1000 nến trên 4 biểu đồ chạy đồng thời.

**Thư viện đầy đủ của TradingView (`charting_library`)** — phương án mạnh mẽ nhất mà mọi trader đều quen thuộc, nhưng không thể cài qua npm — nó đòi hỏi thỏa thuận cấp phép riêng và gói bundle tự host cồng kềnh, quá mức so với nhu cầu thực tế của task T06 và kéo theo vấn đề bản quyền không cần thiết.

## Trade-offs (Đánh đổi)

Thư viện `lightweight-charts` là thư viện đơn mục đích: nó vẽ các chuỗi giá tài chính xuất sắc và không làm gì khác. Bất kỳ đường chỉ báo nào mà task T10 muốn vẽ chồng lên (đường MA, dải Bollinger Bands) đều phải được thêm dưới dạng một chuỗi dữ liệu (series) bổ sung trên cùng biểu đồ thay vì cấu hình qua hệ thống plugin — tường minh hơn nhưng tốn code hơn trên mỗi chỉ báo.

Nó không tích hợp sẵn công cụ vẽ tự do của người dùng hoặc bố cục đa khung hình (multi-pane layout) — ví dụ khối lượng volume ở khung riêng, RSI ở khung bên dưới giá. Dashboard của T08 và các panel chỉ báo sau này phải tự sắp xếp bố cục bằng nhiều instance biểu đồ ghép lại.

Khóa chặt thư viện này cho toàn bộ ứng dụng đồng nghĩa với việc các màn hình trong tương lai muốn vẽ các dạng biểu đồ đặc thù khác (ví dụ biểu đồ phân tán scatter plot cho kết quả search) vẫn phải tìm cách thể hiện qua nó, hoặc phải giải trình một ngoại lệ kiến trúc tường minh khi xây dựng màn hình đó.
