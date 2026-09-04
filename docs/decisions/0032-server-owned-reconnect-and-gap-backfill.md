# Server tự quản lý việc kết nối lại và nạp bù nến bị khuyết

## Why this (Lý do lựa chọn)

Các luồng kết nối WebSocket thời gian thực đến sàn giao dịch đôi khi bị ngắt do biến động đường truyền mạng hoặc sàn bảo trì. Khi điều này xảy ra, các bên tiêu thụ phía sau (biểu đồ, bộ tính toán chỉ báo, bộ chạy chiến lược) tuyệt đối không được để bị mất nến âm thầm hoặc bắt người dùng phải can thiệp thủ công (mục 32.4 và câu hỏi 7 mục 40).

Chúng ta đặt toàn bộ cơ chế kết nối lại, theo dõi con trỏ dữ liệu và nạp bù nến về phía máy chủ (server-owned) bên trong module `market`:
1. **Con trỏ trong bộ nhớ (In-memory cursor)**: Service dữ liệu thị trường theo dõi trường `openTime` của cây nến đã đóng gần nhất cho mỗi luồng `(pair, timeframe)`.
2. **Kết nối lại có giới hạn (Bounded reconnect)**: Khi WebSocket bị ngắt hoặc lỗi truyền tải, adapter sẽ tự động thử lại với thuật toán exponential backoff kèm jitter ngẫu nhiên cho đến số lần tối đa cấu hình, ngăn chặn vòng lặp kết nối vô tận.
3. **Nạp bù khoảng nến bị khuyết (Historical gap backfill)**: Ngay khi thiết lập lại được luồng trực tiếp, những cây nến bị khuyết giữa con trỏ lưu trữ và bộ đệm nến trực tiếp hiện tại sẽ được tự động tải về qua endpoint REST lịch sử của sàn (`/api/v3/klines`).
4. **Khử trùng lặp và gộp theo thứ tự thời gian**: Các cây nến lịch sử vừa khôi phục và các nến trực tiếp trong bộ đệm được khử trùng lặp theo `openTime`, sắp xếp theo thứ tự thời gian và phát ra ngoài theo đúng đường dẫn sự kiện nến chuẩn (`EVENTS.CandleClosed` và push topic `market.candle`).

Cơ chế này đảm bảo các bên tiêu thụ nhận được một luồng nến sạch sẽ, liên tục, không trùng lặp mà không cần biết kết nối mạng với sàn từng bị gián đoạn.

## What else we looked at (Các phương án khác đã cân nhắc)

**Giao cho Frontend tự quản lý phục hồi** — ứng dụng React tự phát hiện luồng bị treo, tự tính khoảng nến bị thiếu và tự gọi request HTTP để nạp bù. Phương án này bị loại vì vi phạm trực tiếp Quy tắc bất khả xâm phạm số 5 (không đưa logic nghiệp vụ vào frontend) và Quy tắc số 6 (frontend không bao giờ polling; server chủ động push). Đặt logic phục hồi ở UI sẽ làm nhân bản logic trên mọi client và để lộ chi tiết thời gian của sàn tới trình duyệt.

**Lưu con trỏ luồng stream vào cơ sở dữ liệu** — ghi nhận từng nến và vị trí con trỏ vào PostgreSQL. Bị loại vì các luồng realtime là các subscription tạm thời được kích hoạt theo nhu cầu người xem thực tế (ADR `0020`). Ghi từng tick của stream vào DB gây nghẽn tranh chấp ghi và phình to dung lượng lưu trữ cho một tác vụ xem giao diện tạm thời. Bộ nhớ tiến trình RAM là đủ nhanh, cô lập và an toàn; các kết nối mới chỉ việc khởi tạo từ mốc thời gian hiện tại của sàn.

## Trade-offs (Đánh đổi)

Việc khởi động lại tiến trình server sẽ làm mất con trỏ tạm thời trong RAM. Khi API restart, các client đang kết nối sẽ re-subscribe và nhận các cây nến lịch sử mới nhất trực tiếp từ endpoint lịch sử.

Adapter của sàn phải cung cấp cả cổng WebSocket streaming lẫn phương thức REST lấy dữ liệu lịch sử, gắn kết thiết kế adapter vào giới hạn kline của riêng sàn đó (đòi hỏi phân trang nếu khoảng thời gian rớt mạng vượt quá giới hạn 1000 nến của một request).
