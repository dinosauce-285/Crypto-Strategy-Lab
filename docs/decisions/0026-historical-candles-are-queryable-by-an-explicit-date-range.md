# Nến lịch sử có thể truy vấn theo khoảng ngày giờ tường minh

## Why this (Lý do lựa chọn)

Trước đây `GET /market/candles` chỉ trả lời câu hỏi "cho tôi N cây nến gần đây nhất", vốn là tất cả những gì biểu đồ của task T06 cần. Tuy nhiên, ví dụ của chính Module 1 về dữ liệu lịch sử là một khoảng ngày giờ cụ thể (`01/07 → 30/07`), và một lượt backtest sẽ đọc cửa sổ dữ liệu của dataset chứ không đọc những cây nến mới nhất vừa xuất hiện — task T12 sẽ cần đến điều này, và tab Backtest là nơi cần đến đầu tiên.

Endpoint này duy trì bản chất là một thao tác đọc từ kho lưu trữ (storage read). ADR `0023` đã quyết định giới hạn việc nạp bù (1000 nến, tải lười khi theo dõi) nhằm mục đích để vòng lặp tìm kiếm của T19 không bao giờ đọc dữ liệu trực tiếp từ Binance; một câu truy vấn theo khoảng ngày giờ nếu âm thầm gọi lên Binance để bù đắp những khoảng trống dữ liệu trong DB sẽ mở lại cánh cửa nguy hiểm đó. Vì vậy, một yêu cầu truy vấn theo khoảng thời gian sẽ trả về trọn vẹn những gì đang có trong cơ sở dữ liệu, ngay cả khi dữ liệu ít hơn khoảng được yêu cầu — trả về một phần hoặc rỗng, tuyệt đối không báo lỗi giả và không gọi API sàn. Việc cố ý nạp thêm dữ liệu (hành động "tải thêm lịch sử") là một tính năng độc lập, dành cho màn hình nào thực sự cần.

## What else we looked at (Các phương án khác đã cân nhắc)

**Tự động gọi sàn nạp bù phần còn thiếu theo nhu cầu rồi mới trả lời** — cách hiển nhiên để yêu cầu luôn "thành công" với đúng khoảng dữ liệu mong muốn. Bị từ chối vì đây chính là vấn đề rate limit mà ADR `0023` sinh ra để chặn: một truy vấn rơi vào khoảng thời gian chưa từng nạp sẽ kích hoạt một cơn bão các lệnh gọi API Binance không kiểm soát.

**Báo lỗi HTTP Error khi dải nến không bao phủ đầy đủ thay vì trả về dữ liệu từng phần** — bên gọi dễ lý luận hơn vì biết ngay có đủ dữ liệu hay không. Nhưng chi phí cao hơn: một khoảng thời gian bao phủ 99% và chỉ thiếu 1% sẽ bị biến thành không thể sử dụng được thay vì dùng được phần lớn, và bên gọi không thể phân biệt giữa "không có dữ liệu" với "database bị sập".

## Trade-offs (Đánh đổi)

Bên gọi API không thể phân biệt chỉ qua endpoint này liệu kết quả ngắn là do thị trường thực tế ít thanh khoản hay do hệ thống chưa nạp bù tới mốc thời gian xa như vậy.

Endpoint giờ đây có hai chế độ hoạt động (chỉ có `limit`, hoặc có `from`/`to`), đòi hỏi bên gọi phải nắm rõ cấu trúc — điều này được chấp nhận vì hai chế độ trả lời hai câu hỏi nghiệp vụ hoàn toàn khác nhau ("những gì vừa xảy ra" so với "những gì đã diễn ra giữa hai mốc thời gian").
