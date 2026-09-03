# Bản ghi Quyết định Kiến trúc (Decision records)

Mỗi quyết định kiến trúc được lưu trong một file riêng biệt. Mỗi bản ghi trả lời duy nhất ba câu hỏi cốt lõi: **tại sao chúng tôi chọn giải pháp này**, **những phương án nào khác đã được cân nhắc và lý do chúng bị loại**, và **chúng tôi phải đánh đổi điều gì**.

Các bản ghi cần ngắn gọn, tập trung vào lập luận kỹ thuật. Không đưa vào các trường trạng thái, người phụ trách, ngày tháng, mã task hay thủ tục hành chính — những thứ đó không ai đọc và sẽ nhanh chóng bị lỗi thời. Nếu một quyết định sau này bị thay thế bởi quyết định khác, hãy tạo một file mới nêu rõ điều đó.

Bắt đầu từ tệp mẫu [`0000-template.md`](0000-template.md).

## Khi nào cần viết một bản ghi quyết định

Một thay đổi bắt buộc phải có bản ghi ADR khi nó thực hiện bất kỳ điều nào sau đây:

- Đưa vào mới hoặc thay đổi một shared type, interface hoặc event contract dùng chung
- Thay đổi cấu trúc cơ sở dữ liệu (database schema)
- Thay đổi cách thức giao tiếp giữa các module (gọi trực tiếp, event bus, hàng đợi queue)
- Thêm mới một dependency, service hoặc thành phần hạ tầng
- Thay đổi quy tắc kiểm thử backtest hoặc công thức chấm điểm — giá vào lệnh, phí, công thức sụt giảm drawdown
- Chốt một trong những quyết định còn đang mở trong `../decisions-to-lock.html`

Hãy viết bản ghi ADR như một phần của chính đợt thay đổi đó, không viết sau khi đã xong. Lập luận kỹ thuật chỉ chuẩn xác nhất khi bạn đang trực tiếp nắm giữ nó trong đầu.

Lệnh `pnpm decision "<quyết định, viết dưới dạng một lựa chọn>"` sẽ khởi tạo một bản ghi: nó tự lấy số thứ tự tiếp theo, tạo sẵn ba đề mục và thêm dòng tương ứng vào danh sách bên dưới. Lệnh `pnpm decision --check`, chạy tự động khi commit, sẽ từ chối bất kỳ bản ghi nào có đề mục để trống hoặc chưa được đưa vào danh sách. Trong một change của OpenSpec, bản ghi ADR là nhóm task 0 trong `tasks.md`, được hoàn thành trước khi viết mã nguồn sử dụng nó.

## Danh sách các Quyết định Kiến trúc (Records)

- [0001](0001-typescript-nest-react.md) — TypeScript trên cả hai đầu: NestJS backend, React + Vite frontend
- [0002](0002-postgres-prisma.md) — PostgreSQL cho toàn bộ dữ liệu, truy xuất thông qua Prisma
- [0003](0003-in-process-event-bus.md) — Các module giao tiếp qua bus sự kiện nội tiến trình (in-process event bus)
- [0004](0004-bullmq-for-backtests.md) — Tác vụ backtest chạy qua hàng đợi BullMQ trên Redis
- [0005](0005-sentiment-via-groq.md) — Phân loại cảm xúc tin tức gọi API Groq, đứng sau interface provider
- [0006](0006-signal-carries-strength.md) — Tín hiệu mang theo chiều hướng (direction) và độ mạnh (strength)
- [0007](0007-candidate-as-spec.md) — Chiến lược ứng viên luân chuyển dưới dạng dữ liệu đặc tả, chỉ khởi tạo thành object khi chạy
- [0008](0008-strategy-declares-its-data.md) — Chiến lược tự khai báo dữ liệu cần dùng, và engine chuẩn bị dữ liệu đó
- [0009](0009-strategy-versioning.md) — Chiến lược được đóng dấu hai lần: version đặt tay cho code, hash cho bộ tham số
- [0010](0010-dataset-carries-the-backtest-rules.md) — Dataset là một bản ghi có id riêng, mang theo toàn bộ quy tắc backtest
- [0011](0011-leaderboard-is-recomputed.md) — Bảng xếp hạng được tính toán lại trực tiếp từ các experiment trên mỗi lần đọc
- [0012](0012-strategy-metadata.md) — Mọi chiến lược tự mô tả metadata, ba thành phần của hệ thống đọc mô tả đó
- [0013](0013-generator-receives-history.md) — Bộ sinh ứng viên nhận lịch sử các vòng chạy trước để tránh lặp lại
- [0014](0014-weighted-merge-only.md) — Các tín hiệu chỉ được kết hợp thông qua tính điểm có trọng số (weighted score)
- [0015](0015-unknowable-numbers-are-searchable.md) — Các tham số không thể đoán trước được đưa vào đặc tả và giải đáp bởi leaderboard
- [0016](0016-database-enforces-what-a-type-cannot.md) — Các bảng phản ánh đúng contract, Postgres chỉ ràng buộc những gì hệ thống type không thể
- [0017](0017-one-push-channel-addressed-by-topic.md) — Trình duyệt nhận dữ liệu qua một kênh push duy nhất phân định theo topic
- [0018](0018-features-planned-in-openspec.md) — Các tính năng được lập kế hoạch qua OpenSpec, và lập luận vẫn lưu tại đây
- [0019](0019-the-push-channel-runs-on-socket-io.md) — Kênh push vận hành trên Socket.IO
- [0020](0020-module-reaches-the-browser-through-ports.md) — Module kết nối tới trình duyệt qua các cổng port của kênh, không qua bus
- [0021](0021-a-search-run-declares-its-bound-before-it-starts.md) — Một search run phải khai báo giới hạn dừng (bound) trước khi bắt đầu
- [0022](0022-historical-candles-are-drawn-with-lightweight-charts.md) — Biểu đồ nến được vẽ bằng thư viện TradingView Lightweight Charts
- [0023](0023-backfill-is-1000-candles-per-pair-and-timeframe-fetched-lazi.md) — Cơ chế backfill tải lười 1000 nến cho mỗi cặp coin và khung thời gian
- [0024](0024-realtime-ticks-carry-volume-and-buy-sell-side.md) — Khớp lệnh realtime mang theo khối lượng volume và bên mua/bán
- [0025](0025-tab-navigation-uses-react-router.md) — Điều hướng các tab Realtime/Backtest thông qua URL React Router
- [0026](0026-historical-candles-are-queryable-by-an-explicit-date-range.md) — Nến lịch sử có thể truy vấn theo khoảng ngày giờ tường minh
- [0027](0027-the-historical-adapter-sits-behind-exchangehistoryport.md) — Adapter lịch sử nằm sau ExchangeHistoryPort tương tự REST side
- [0028](0028-indicator-series-are-named-by-dotted-source-one-field-per-da.md) — Chuỗi chỉ báo đặt tên theo cấu trúc nguồn dấu chấm, một trường cho mỗi DataRequest
- [0029](0029-support-resistance-zones-come-from-causally-confirmed-cluste.md) — Vùng hỗ trợ/kháng cự xác định từ các cụm pivot có xác nhận nhân quả
- [0030](0030-apps-api-gets-jest-for-unit-tests.md) — apps/api sử dụng Jest cho unit test
- [0031](0031-news-collector-multi-provider-architecture.md) — Kiến trúc đa nhà cung cấp cho tin tức và tách rời phân tích cảm xúc
- [0032](0032-server-owned-reconnect-and-gap-backfill.md) — Server tự quản lý việc kết nối lại và nạp bù nến bị khuyết
- [0033](0033-strategies-are-registered-explicitly.md) — Các chiến lược được đăng ký một cách tường minh qua danh sách
- [0034](0034-backtest-execution-rules-for-entry-price-trading-fees-and-wa.md) — Quy tắc thực thi backtest cho giá vào lệnh, phí giao dịch và warm-up
- [0035](0035-metric-evaluation-formulas-for-profit-calculation-modes-draw.md) — Công thức tính toán các chỉ số lợi nhuận, mức sụt giảm drawdown và thống kê
- [0036](0036-overall-score-formula-and-trade-count-damping-for-leaderboar.md) — Công thức tính điểm tổng hợp và hệ số giảm chấn số lượng giao dịch cho leaderboard
- [0037](0037-domain-guided-search-uses-group-composition-and-top-history.md) — Tìm kiếm định hướng miền dùng cấu trúc nhóm và lịch sử kết quả hàng đầu
- [0038](0038-search-runs-carry-strategy-universe.md) — Mỗi search run mang theo danh sách các phiên bản chiến lược được chọn
- [0039](0039-news-sentiment-strategy-and-causal-aggregation.md) — Chiến lược cảm xúc tin tức cắm vào registry kèm cơ chế tổng hợp nhân quả
- [0040](0040-realtime-watched-candles-are-read-live-from-the-exchange-not.md) — Nến realtime được đọc trực tiếp từ sàn và không lưu vào database
- [0041](0041-dataset-creation-fetches-and-stores-its-own-candle-range-fro.md) — Việc tạo dataset tự tải và lưu trữ khoảng nến từ sàn có phân trang
- [0042](0042-the-search-worker-evaluates-and-records-experiments-through.md) — Search worker đánh giá và ghi nhận experiment qua EvaluatorPort
- [0043](0043-backtest-screen-supports-full-candidate-specification-inspec.md) — Màn hình backtest hỗ trợ kiểm tra chi tiết đặc tả ứng viên và tự động chạy
- [0044](0044-domain-errors-carry-their-http-status-and-a-global-filter-ma.md) — Lỗi nghiệp vụ mang mã trạng thái HTTP và được xử lý bởi filter toàn cục
- [0045](0045-a-paused-run-stops-spending-its-budget-and-holds-a-lease-ins.md) — Lượt chạy tạm dừng không tiêu tốn ngân sách thời gian và giữ khóa lease
- [0046](0046-the-timeframe-set-follows-section-3-and-adds-30m-and-2h.md) — Bộ khung thời gian bao quát mọi ví dụ trong đề bài kèm thêm 30m và 2h
- [0047](0047-a-run-reports-the-candidate-being-tested-right-now.md) — Lượt chạy báo cáo ứng viên cụ thể đang được kiểm thử ngay tức thì
- [0048](0048-the-weight-grid-and-default-threshold-live-in-the-contract-n.md) — Lưới bước nhảy trọng số và ngưỡng mặc định nằm trong contract, không nằm trong generator
- [0049](0049-active-backtests-hold-a-durable-dataset-lease.md) — Các lượt backtest đang chạy giữ khóa an toàn DatasetLease bền vững
- [0050](0050-a-genetic-search-mode-breeds-candidates-from-the-search-run.md) — Chế độ tìm kiếm di truyền lai tạo ứng viên từ lịch sử của chính lượt chạy
- [0051](0051-the-web-ui-adopts-an-exchange-terminal-visual-system-dark-gr.md) — Giao diện Web áp dụng hệ thống hình ảnh terminal sàn giao dịch: nền tối, màu nhấn hổ phách, bảng dữ liệu cô đọng

Một bản ghi chỉ được viết khi một quyết định thực sự được đưa ra. Không tạo trước các tệp khung trống — một file trống tệ hơn là không có file, vì nó tạo cảm giác giả tạo như thể đã có sự suy nghĩ thấu đáo.

## Các quyết định đã chốt

Tất cả 11 quyết định trong `../decisions-to-lock.html` đều đã được chốt, cùng với quy tắc kết hợp (merge rule) nằm ngoài danh sách.

- **Năm quy tắc backtest** — giá vào lệnh, phí, warm-up, cộng dồn hay lãi kép, và điểm đo drawdown. ADR `0010` quyết định các giá trị này thuộc về dataset; giá trị cụ thể được chốt trong `0034` và `0035`.
- **Công thức điểm tổng hợp** — cách tỷ suất lợi nhuận, tỷ lệ thắng và mức sụt giảm được tính điểm thành một con số duy nhất, được giải quyết tại ADR `0036`.
- Cấu trúc chuẩn hóa và làm tròn trước khi băm dữ liệu trong `0009`, cùng kiểm tra hợp lệ đầu hàng đợi trong `0007`.
