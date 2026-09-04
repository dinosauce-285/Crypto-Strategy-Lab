# Kiến trúc đa nhà cung cấp cho tin tức và tách rời phân tích cảm xúc

## Why this (Lý do lựa chọn)

Hệ thống con thu thập tin tức phải thu nạp các bài báo ảnh hưởng đến thị trường từ nhiều nguồn đa dạng — từ các endpoint REST có cấu trúc (CryptoCompare) đến các nguồn cấp RSS feeds bán cấu trúc (CoinDesk, Cointelegraph RSS) — đồng thời phải đáp ứng hai yêu cầu kiến trúc cốt lõi: tuyệt đối không gắn chặt trực tiếp vào mô hình học máy (anti-pattern mục 44) và không gây hiệu ứng gợn sóng (ripple effect) khi bổ sung nguồn tin tức mới (mục 40).

Đặt các nguồn cấp tin tức đứng sau interface trừu tượng `NewsProviderPort` giúp cách ly hoàn toàn giao thức truyền tải, cách parse schema, kiểm soát rate limit và xử lý lỗi đặc thù của từng nhà cung cấp ra khỏi phần còn lại của ứng dụng. Việc thêm một nguồn RSS feed mới hoặc một luồng tin tức sàn giao dịch chỉ đòi hỏi cài đặt duy nhất một class provider mới và đăng ký nó trong `NewsModule`, không cần chạm vào logic thu nạp hay lưu trữ.

Mục 44 nghiêm cấm crawler gọi trực tiếp mô hình phân tích cảm xúc (anti-pattern "Crawler welded to ML"). Thay vào đó, `NewsService` điều phối các provider, lưu các bài báo đã chuẩn hóa thông qua `NewsRepository` vào cơ sở dữ liệu PostgreSQL với cơ chế chống trùng lặp theo URL bài báo, rồi phát sự kiện `EVENTS.NewsCollected` (`news.collected`) lên bus sự kiện nội tiến trình (`EventEmitter2`, ADR `0003`). Module phân tích cảm xúc sentiment (task T23) đăng ký lắng nghe sự kiện này một cách độc lập, giúp khoanh vùng bán kính ảnh hưởng khi có sự cố: một sự cố hay sự chậm trễ trong phân loại cảm xúc tuyệt đối không thể làm nghẽn tiến trình thu thập tin tức hay làm ảnh hưởng đến dữ liệu thị trường.

Cơ chế chống trùng lặp cấp cơ sở dữ liệu thông qua ràng buộc unique index trên trường `url` (ADR `0016`) đảm bảo tính lũy thừa (idempotency) cho các đợt crawl định kỳ mà không cần duy trì bộ nhớ đệm RAM phức tạp dễ mất khi restart server.

## What else we looked at (Các phương án khác đã cân nhắc)

**Chấm điểm cảm xúc đồng bộ trực tiếp bên trong crawler** — luồng xử lý đơn giản nhất từ đầu đến cuối. Bị từ chối vì vi phạm trực tiếp mục 44 và trượt bài kiểm tra cô lập của mục 40: nếu API mô hình sentiment (Groq) bị bóp băng thông hoặc sập, việc thu thập tin tức sẽ bị đình trệ; nếu phân loại chậm, tốc độ crawl sẽ sụp đổ.

**Chỉ dùng một nhà cung cấp ghi cứng không qua abstraction port** — chỉ lấy tin từ CryptoCompare REST API. Bị loại bỏ vì tin tức crypto bị phân mảnh khắp nơi. Cài đặt ghi cứng sẽ gắn chặt service vào một nhà cung cấp duy nhất và việc thêm nguồn dự phòng sẽ đòi hỏi sửa đổi lõi của service.

**Dùng hàng đợi thông điệp nặng (BullMQ/RabbitMQ) cho việc thu nạp tin** — dùng worker riêng cho từng bài báo. BullMQ đã được dành riêng cho các tác vụ tính toán backtest nặng (ADR `0004`). Việc thu thập tin tức chỉ là các đợt I/O định kỳ; đưa thêm hạ tầng message broker vào đây chỉ làm tăng độ phức tạp vận hành mà không đem lại lợi ích, trong khi in-process event bus đáp ứng hoàn hảo sự tách rời với chi phí bằng 0.

## Trade-offs (Đánh đổi)

Việc chấm điểm cảm xúc đạt tính nhất quán sau cùng (eventually consistent) thay vì có sẵn ngay lúc nạp. Bài báo ban đầu được lưu khi chưa có điểm sentiment (`sentiment: null`), và điểm số được gắn sau khi consumer hoàn thành phân loại.

Việc chuẩn hóa các nhà cung cấp khác nhau về cùng một schema `NewsItem` chung (`id`, `title`, `content`, `source`, `publishedAt`, `crawledAt`, `relatedCoins`, `url`) chấp nhận mức mẫu số chung thấp nhất. Các trường metadata đặc thù của riêng nguồn tin (danh mục tùy biến, đối tượng tác giả gốc) sẽ bị lược bỏ.

Điều phối đa nhà cung cấp làm tăng độ biến thiên về thời gian thực thi crawl. Vì RSS feeds và REST APIs có độ trễ khác nhau, `NewsService` phải có cơ chế chịu lỗi từng phần để một feed bị timeout không ngăn cản các nguồn khác lưu bài báo vào DB.
