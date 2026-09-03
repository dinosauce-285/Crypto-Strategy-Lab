# Chiến lược sentiment tin tức cắm vào registry chiến lược với tổng hợp quan hệ nhân quả

## Why this (Lý do lựa chọn)

Section 30 của bản mô tả dự án nêu rõ tâm lý tin tức (news sentiment) có thể trở thành một chiến lược giao dịch, đưa ra ví dụ cụ thể:
`Điểm tâm lý trung bình trong 1 giờ > 0.7 -> BUY`, `Điểm tâm lý trung bình < -0.7 -> SELL`. Section 17 giới thiệu nhóm `Information` để đáp ứng các chiến lược bắt nguồn từ các nguồn thông tin phi giá cả, và Section 46 Bước 9–10 chỉ định việc đưa `SentimentStrategy` vào không gian tìm kiếm để tạo ra các ứng viên tổng hợp như `MA + RSI + News Sentiment`.

Để đáp ứng yêu cầu này trong khi vẫn duy trì các ranh giới kiến trúc nghiêm ngặt (AGENTS.md, ADR 0008, ADR 0012):
1. `SentimentStrategy` triển khai giao diện `Strategy` chuẩn và khai báo các yêu cầu dữ liệu của nó thông qua `requires(params)` dưới dạng `{ source: 'sentiment', params: { windowHours } }`.
2. Chiến lược chỉ chứa logic giao dịch thuần túy: nó đánh giá tín hiệu từ các điểm số tâm lý đã được tính toán trước do `StrategyContext.get()` cung cấp và không bao giờ tự truy cập trực tiếp vào cơ sở dữ liệu hoặc API bên thứ ba.
3. Việc tổng hợp tâm lý theo luật nhân quả được tính toán bởi `SentimentCalculator` (`name: 'sentiment'`), thực thi nghiêm ngặt rằng đối với bất kỳ cây nến nào tại `openTime`, chỉ các bài báo tin tức có `publishedAt <= openTime` và nằm trong cửa sổ nhìn lại `[openTime - windowMs, openTime]` mới được tổng hợp. Điều này loại bỏ hoàn toàn thiên lệch nhìn trước tương lai (lookahead bias) trong các đợt backtest (ADR 0034).

## What else we looked at (Các phương án khác đã cân nhắc)

**Để chiến lược truy vấn trực tiếp bảng News** — điều này sẽ vi phạm bất biến kiến trúc cốt lõi nghiêm cấm các chiến lược truy cập cơ sở dữ liệu (phản mẫu Section 44). Nó cũng sẽ phá vỡ tính tái lập giữa các lượt chạy ứng viên và ngăn chặn việc lưu bộ nhớ đệm (caching).

**Hardcode tín hiệu tâm lý bên ngoài registry chiến lược** — xử lý tâm lý tin tức như một tầng heuristic riêng biệt bên ngoài `StrategyRegistry` và `DomainGuidedCandidateGenerator`. Phương án này bị bác bỏ vì bản đặc tả yêu cầu cụ thể rằng tâm lý phải là một chiến lược chuẩn có thể kết hợp được trong không gian tìm kiếm (Section 30, Section 46).

## Trade-offs (Đánh đổi)

Chuỗi dữ liệu tâm lý trượt (rolling sentiment series) phải được chuẩn bị cho mỗi dataset và mốc thời gian nến, bổ sung thêm một lượt tính toán trong `IndicatorService`. Tuy nhiên, vì các tính toán tâm lý là hàm thuần túy và được lưu cache, chi phí phụ trội qua các lần lặp ứng viên là rất nhỏ.
