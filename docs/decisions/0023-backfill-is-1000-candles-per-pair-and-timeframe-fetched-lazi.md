# Cơ chế backfill tải lười 1000 nến cho mỗi cặp coin và khung thời gian

## Why this (Lý do lựa chọn)

Vòng lặp tìm kiếm trong task T19 thực hiện backtest lên tới 10.000 ứng viên (mục 43 đề bài). Nếu mỗi lượt backtest đều gọi trực tiếp lên sàn Binance để lấy nến, hệ thống sẽ thực hiện tối thiểu 10.000 lệnh gọi API và đâm thẳng vào giới hạn rate limit của Binance. Lưu trữ lịch sử nến một lần duy nhất vào cơ sở dữ liệu PostgreSQL và đọc từ database cho mọi lượt backtest sau đó sẽ tách rời hoàn toàn sàn giao dịch ra khỏi vòng lặp tìm kiếm.

Quy tắc bất khả xâm phạm số 7: Một lượt backtest tuyệt đối không được đọc dữ liệu tương lai vượt quá cây nến nó đang đứng, và việc chạy lại phải cho ra kết quả y hệt nhau. Một độ sâu lịch sử cố định được tải về một lần, chỉ được nối dài thêm bởi các cây nến mới đến qua sự kiện `CandleClosed` của task T07, đảm bảo tính bất biến này — không có dòng dữ liệu cũ nào bị sửa đổi chỉ vì một request sau đó đòi hỏi xem thêm lịch sử.

Việc tải lười (lazy fetch) tại thời điểm lần đầu tiên có người theo dõi một cặp coin và khung thời gian, thay vì nạp cứng một danh sách cặp coin cố định từ đầu, giúp việc lưu trữ bám sát chính xác những gì ứng dụng thực sự hiển thị. Danh sách coin trong `MarketPanel.tsx` (`BTCUSDT`, `ETHUSDT`, `SOLUSDT`) là danh sách tạm thời có thể thay đổi; việc gán cứng một quyết định lưu trữ vào ba cặp coin này sẽ buộc phải sửa lại ngay khi danh sách thay đổi.

Con số 1000 nến cũng là mức trần thực tế: Endpoint REST lấy klines của Binance giới hạn tối đa 1000 dòng cho một request đơn lẻ, do đó đây là lượng dữ liệu nạp bù lớn nhất có thể lấy được mà không cần phân trang (pagination), giúp giữ cho tác vụ ban đầu không bị phức tạp hóa quá sớm.

## What else we looked at (Các phương án khác đã cân nhắc)

**Nạp bù toàn bộ lịch sử khả dụng từ trước đến nay** — đầy đủ nhất, nhưng không có giới hạn — nó sẽ liên tục gọi phân trang Binance cho những cặp coin và khung thời gian mà chưa ai từng xem, lãng phí hạn ngạch API và dung lượng lưu trữ vào những dữ liệu không màn hình nào cần tới.

**Tải dữ liệu nến theo nhu cầu trong từng lượt backtest của T19** — đây chính là mô hình mà task T06 sinh ra để ngăn chặn: gọi API trực tiếp cho từng ứng viên sẽ chạm ngay ngưỡng chặn rate limit của Binance.

**Nạp cứng sẵn dữ liệu cho danh sách cặp coin/khung thời gian từ trước** — dễ hình dung hơn vì có sẵn dữ liệu lúc deploy, nhưng nó gắn chặt quyết định lưu trữ vào danh sách tạm thời của UI, và mỗi cặp coin mới sau này sẽ lại cần thêm một luồng nạp bù thứ hai. Cơ chế tải lười khi theo dõi (lazy-on-watch) là luồng duy nhất bao quát trọn vẹn cả hai trường hợp.

## Trade-offs (Đánh đổi)

1000 cây nến có thể chưa đủ dài cho các chiến lược tương lai đòi hỏi chu kỳ quan sát rất lớn — ví dụ một đường MA chu kỳ 500 trên khung `1m` sẽ cần nhiều lịch sử hơn mức 1000 nến cung cấp. Để lấy nhiều hơn sẽ cần một cơ chế gọi nạp bù thứ hai cho cặp coin đó.

Cơ chế tải lười đồng nghĩa với việc client đầu tiên theo dõi một cặp coin/timeframe mới sẽ phải chịu một độ trễ nhỏ (thời gian một lượt gọi REST) trước khi biểu đồ có dữ liệu hiển thị, thay vì dữ liệu đã nằm sẵn trong DB.

Độ sâu cố định 1000 nến cho mọi cặp coin đồng nghĩa với việc các cặp giao dịch có tần suất dày đặc hay thưa thớt đều nhận cùng một lượng 1000 nến trên cùng một khung thời gian — bao phủ khoảng thời gian thực tế bằng nhau nhưng độ biến động có thể khác nhau.
