# Chuỗi chỉ báo đặt tên theo cấu trúc nguồn dấu chấm, một trường cho mỗi DataRequest

## Why this (Lý do lựa chọn)

Trường `DataRequest.source` (`packages/contracts/src/strategy.ts`, được chốt bởi ADR `0008`) là một chuỗi string, và hàm `StrategyContext.get` trả về một mảng số `number[]`. Chỉ báo MA và RSI khớp trực tiếp với định dạng này. Nhưng Bollinger Bands thì không — mục 9 của đề bài vẽ tới ba đường từ cùng một chỉ báo — và chỉ báo Hỗ trợ/Kháng cự cũng vậy, vốn được codebase này xử lý thành hai chuỗi độc lập (hỗ trợ và kháng cự biến thiên độc lập; một cây nến có thể nằm gần một đường, cả hai đường, hoặc không đường nào).

Quy ước đặt tên được chọn là `<indicator-name>.<field>`, sử dụng định dạng `kebab-case`, và bỏ qua phần trường đối với các chỉ báo chỉ có một chuỗi dữ liệu duy nhất: `ma`, `rsi`, `bollinger.upper`, `bollinger.middle`, `bollinger.lower`, `support-resistance.support`, `support-resistance.resistance`. Quy ước này phản ánh chính xác cấu trúc namespace bằng dấu chấm mà `packages/contracts/src/events.ts` đang dùng cho tên sự kiện (`market.candle.closed`), tạo sự nhất quán cho người đọc.

Sự phân tách này mang ý nghĩa lớn hơn việc đặt tên. Ba dải của Bollinger Bands dùng chung một lượt tính toán SMA và độ lệch chuẩn stddev; việc tính `upper`, `middle` và `lower` như ba chỉ báo riêng biệt không liên quan sẽ làm tăng gấp ba khối lượng tính toán cho mọi ứng viên cần đến chúng. `IndicatorService` tách `source` tại dấu `.` đầu tiên để lấy cặp `[name, field]`, và mọi bộ tính toán đều trả về một `Record<string, number[]>` ngay cả khi nó chỉ có một trường — nhờ đó khóa cache là `(datasetId, name, params)`, không phải `(datasetId, source, params)`, và ba yêu cầu `DataRequest` cho cùng một chỉ báo và tham số sẽ dùng chung một lượt tính toán duy nhất và một bản ghi cache duy nhất.

## What else we looked at (Các phương án khác đã cân nhắc)

**Nguồn trả về một struct, một request cho toàn bộ chỉ báo** — `bollinger` trả về `{upper, middle, lower}` và chiến lược tự phân rã dữ liệu. Nhưng nó phá vỡ hợp đồng `get(request: DataRequest): readonly number[]` đã được chốt ở ADR `0008` — mọi bên gọi sẽ cần thêm kiểu dữ liệu trả về thứ hai không tương thích và `StrategyContext` sẽ cần hai phương thức thay vì một.

**Tách thành ba chỉ báo hoàn toàn riêng biệt** (`bollinger-upper`, `bollinger-mid`, `bollinger-lower`) — vứt bỏ sự chia sẻ tính toán chung mà quyết định này muốn bảo vệ, và ba tên gọi không thể hiện mối quan hệ họ hàng tự nhiên với nhau trong registry.

## Trade-offs (Đánh đổi)

`IndicatorService` giờ đây phải điều phối theo hai tầng: phân phát theo chuỗi `source` đầy đủ nhưng lưu cache theo `name` độc lập. Một bộ tính toán nếu quên điền một trường trong object trả về sẽ gây lỗi tại thời điểm chiến lược đọc trường đó lúc runtime.

Quy ước này vận hành chuẩn xác vì tên các chỉ báo kỹ thuật không bao giờ chứa dấu chấm `.` thực tế trong tên của chúng.
