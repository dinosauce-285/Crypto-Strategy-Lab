# Các cây nến được theo dõi thời gian thực được đọc trực tiếp từ sàn, không lưu trữ vĩnh viễn

## Why this (Lý do lựa chọn)

`0023` đã gắn chặt hai việc không thực sự cần đi cùng nhau: bù đắp dữ liệu (backfilling) cho một cặp tiền/khung thời gian khi lần đầu theo dõi, và lưu trữ dữ liệu đó vĩnh viễn sau đó. Nửa lưu trữ được sinh ra là để phục vụ backtest — lập luận của chính `0023` hoàn toàn xoay quanh giới hạn tần suất (rate limit) của T19 và bảo đảm tính tái lập của Iron Rule 7, cả hai điều này tab Realtime đều không cần. Một biểu đồ đang được xem ngay lúc này không cần phải có khả năng phát lại vào tháng sau.

`0032` đã từng đưa ra chính xác lập luận này một lần, dành riêng cho con trỏ kết nối lại (reconnect cursor): phương án thay thế bị từ chối của nó là "database-backed stream cursor" chỉ ra rằng việc lưu trữ từng tick stream vào DB "tạo ra xung đột ghi và làm phình to dung lượng lưu trữ chỉ để xem UI tạm thời mà không đem lại lợi ích kiến trúc nào... bộ nhớ tiến trình là nhanh, cô lập và đủ dùng." Lập luận đó không dừng lại ở con trỏ — nó cũng áp dụng hoàn hảo cho chính các cây nến. Không có điều gì trong việc hiển thị cho ai đó một biểu đồ trực tiếp đòi hỏi phải giữ dữ liệu lại sau khi họ đóng tab.

Khi không có chính sách giữ dữ liệu (retention policy) nào trong toàn hệ thống, hậu quả thực tế của việc gắn việc lưu trữ với việc theo dõi trực tiếp là một bảng `Candle` không có giới hạn trên: nó phình to chừng nào còn có người mở một cặp tiền, bất kể dữ liệu đó có bao giờ được backtest hay không. Giờ đây khi `0041` cấp cho việc tạo Dataset lệnh nạp tường minh và có phạm vi riêng của nó, việc lưu trữ đã có một chủ sở hữu thực sự — một Dataset — và việc theo dõi Realtime quay trở lại đúng bản chất mà `0032` luôn đối xử: một khung nhìn tạm thời, được phục vụ trực tiếp.

Chế độ "N nến gần nhất" của `GET /market/candles` (không có `from`/`to`) giờ đây gọi trực tiếp `ExchangeHistoryPort.fetchKlines`. Chế độ khoảng `from`/`to` vẫn giữ nguyên — đó là bất biến chỉ đọc từ kho lưu trữ của `0026`, vẫn đúng và vẫn phục vụ các lượt đọc dựa trên Dataset. Các tick trực tiếp và sự kiện đóng nến tiếp tục truyền qua cùng một kênh WebSocket (`0017`, `0019`) chính xác như trước; chỉ có thao tác ghi vào cơ sở dữ liệu trên mỗi lần đóng nến là được gỡ bỏ.

## What else we looked at (Các phương án khác đã cân nhắc)

**Tiếp tục lưu trữ, bổ sung tác vụ dọn dẹp/cắt tỉa (retention/pruning job).** Giới hạn sự tăng trưởng mà không ảnh hưởng tới luồng đọc. Bị từ chối vì giải quyết sai vấn đề: dữ liệu bị cắt tỉa vốn dĩ ngay từ đầu chưa từng cần thiết cho việc xem, và việc cắt tỉa các cây nến mà một Dataset có thể vẫn đang tham chiếu (ngay cả Dataset chưa có Thực nghiệm nào) có nguy cơ gây ra lỗi mất tính tái lập mà Iron Rule 7 của `0023` sinh ra để ngăn chặn. Hoàn toàn không lưu trữ dữ liệu chưa được theo dõi, chưa được backtest sẽ đơn giản hơn việc lưu trữ rồi sau đó phải phân vân quyết định xem xóa có an toàn hay không.

**Giữ hành vi backfill-khi-theo-dõi hiện tại, để Datasets đọc bất cứ thứ gì có sẵn.** Hiện trạng cũ. Bị từ chối vì đó chính xác là lỗi mà toàn bộ thay đổi này bắt đầu giải quyết: tính khả dụng của dữ liệu Dataset trở thành một sự ngẫu nhiên của lịch sử duyệt web Realtime thay vì một yêu cầu có chủ đích, và dung lượng lưu trữ tăng lên vì những lý do không ai chủ động chọn.

## Trade-offs (Đánh đổi)

Mỗi lần mở tab Realtime giờ đây tiêu tốn một lệnh gọi REST tới Binance thay vì đọc Postgres — độ trễ cao hơn một chút ở lần hiển thị đầu tiên (first paint), và chiếm một phần nhỏ liên tục trong hạn mức yêu cầu theo tỷ lệ số người đang mở tab, chứ không phải theo lượng dữ liệu đã được backfill một lần. Ở mức sử dụng hiện tại, điều này còn cách rất xa giới hạn tần suất của Binance (xem tính toán trọng số của `0041`), nhưng đây là một hình thái chi phí khác trước đây và cần theo dõi nếu lượng người xem đồng thời tăng cao.

Con trỏ vá lỗ hổng khi kết nối lại (`0032`) giờ đây tự khởi tạo giá trị từ một lệnh gọi đơn lẻ `fetchKlines(pair, timeframe, 1)` với chi phí thấp thay vì đọc một hàng backfill có sẵn. Nếu một máy khách ngắt kết nối trước khi lệnh gọi này hoàn tất, việc vá lỗ hổng sẽ không có điểm bắt đầu cho đến khi cây nến trực tiếp tiếp theo đến — một trường hợp biên mà `0032` trước đây không phải bận tâm, vì hàng backfill luôn luôn có sẵn từ trước.
