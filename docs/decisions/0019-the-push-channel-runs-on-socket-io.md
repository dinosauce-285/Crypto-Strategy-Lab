# Kênh push vận hành trên Socket.IO

## Why this (Lý do lựa chọn)

Mục 4 của đề bài yêu cầu frontend không được liên tục hỏi giá (không polling), và mục 45 §4 đặt câu hỏi trực tiếp dưới mã `ADR-001` — tại sao lại dùng socket? ADR `0017` đã giải quyết vấn đề những gì sẽ được truyền trên kênh đó và cách phân định địa chỉ theo topic, nhưng chưa chỉ định cụ thể công nghệ nào. Bản ghi này chính là nửa còn lại.

Bốn yêu cầu kỹ thuật bắt buộc đối với công nghệ truyền tải: Server bắt buộc phải chủ động nói trước được (server-initiated), vì mục đích cốt lõi là trình duyệt ngừng hỏi giá. Client bắt buộc phải nói ngược lại được với server (hai chiều), vì ADR `0017` phân định địa chỉ theo topic và hành động đăng ký subscription chính là việc client nói cho server biết nó muốn nhận những topic nào — và việc hủy đăng ký (unsubscribe) là yêu cầu rõ ràng của task T08. Một kết nối duy nhất phải gánh được cả bốn loại luồng dữ liệu khác nhau, vì ADR `0017` từ chối việc đẻ thêm kết nối riêng cho từng loại. Và nó phải sống sót được qua việc người dùng gập màn hình laptop, vì bài demo ở mục 46 là một màn hình trình chiếu để mở liên tục.

Socket.IO đáp ứng trọn vẹn hai yêu cầu sau cùng mà chúng ta không cần phải tự viết code: Cơ chế tự động kết nối lại (reconnection) với khoảng thời gian giãn cách (backoff) đã tích hợp sẵn ở client; phía server là một NestJS gateway sử dụng `@nestjs/platform-socket.io`, giúp duy trì nhất quán ranh giới module của toàn hệ thống. Khái niệm Rooms của Socket.IO hóa ra lại chính là cấu trúc dữ liệu hoàn hảo cho việc so khớp topic — một tập hợp các socket kết nối ứng với mỗi chuỗi string — giúp việc so khớp của ADR `0017` trở thành một lệnh gọi thư viện có sẵn thay vì một cấu trúc `Map` tự duy trì bằng tay.

Tin nhắn gửi tới client được gắn theo tên sự kiện trùng với tên topic của nó thay vì một tên sự kiện chung chung, nhờ đó một client theo dõi 4 topic chỉ bị đánh thức bởi đúng topic có biến động thay vì phải tự lọc 4 luồng dữ liệu bằng tay.

Điểm quan trọng cần phân biệt: ADR `0017` từng từ chối "Rooms hoặc Namespaces của thư viện socket" với tư cách là *hợp đồng giao tiếp (contract)*: client gọi tên room qua API thư viện và cơ chế định địa chỉ bị khóa vào thư viện đó. Còn ở đây, client gửi một chuỗi topic do `@csl/contracts` xây dựng chuẩn hóa, và server tình cờ sử dụng Rooms để cài đặt logic so khớp bên dưới. Việc đổi thư viện sau này chỉ là thay đổi chi tiết cài đặt và không làm xáo trộn bất kỳ dòng code client nào.

## What else we looked at (Các phương án khác đã cân nhắc)

**Dùng WebSocket thuần (Raw WebSocket)** — `@nestjs/platform-ws` ở server và `WebSocket` tích hợp sẵn của trình duyệt ở client. Đây là câu trả lời sát nghĩa nhất cho câu hỏi "tại sao dùng WebSocket", không làm tăng kích thước bundle frontend, và các gói tin trên đường truyền có thể đọc trực tiếp bằng devtools. Nhưng nó thua ở ba tính năng mà chúng ta sẽ phải tự viết tay: tự động kết nối lại khi rớt mạng, cơ chế heartbeat phát hiện kết nối bị treo ảo, và bảng ánh xạ topic-sang-socket. Cả ba tính năng này đều đã được kiểm thử ổn định trong Socket.IO. Tự viết lại chúng là lãng phí công sức vào nơi không được chấm điểm.

**Server-Sent Events (SSE)** — một chiều, HTTP thông thường, không cần thư viện ở hai đầu. Nhưng nó gãy ở chiều client nói lại với server: việc subscribe sẽ biến thành một lượt gọi HTTP riêng mang theo connection id, khiến giao thức bị xé thành hai cơ chế độc lập và phải liên kết id thủ công. Hơn nữa, chuẩn HTTP/1.1 giới hạn trình duyệt tối đa 6 kết nối đồng thời trên một domain, trong khi task T08 đặt 4 biểu đồ trên cùng một màn hình bên cạnh các lệnh gọi API thông thường.

**Polling theo bộ đếm thời gian (Timer polling)** — giải pháp không cần quyết định transport, nhưng là thứ mà mục 4 nêu tên và nghiêm cấm rõ ràng. Với 4 biểu đồ và nhiều tick mỗi giây, polling là điều hoàn toàn phi lý.

## Trade-offs (Đánh đổi)

Định dạng gói tin trên đường truyền là định dạng riêng của Socket.IO, không phải WebSocket thuần. Các công cụ như `curl` không thể đọc trực tiếp kênh này, và script kiểm tra `scripts/ws-probe.mjs` phải import `socket.io-client` thay vì dùng API có sẵn.

Thêm hai thư viện phụ thuộc vào dự án (client và server), và phiên bản chính (major version) của chúng phải đi cùng nhau, không thể nâng cấp lệch ngày giữa server và client.

Cơ chế tự động kết nối lại có thể che giấu một sự kiện quan trọng: ADR `0017` quy định các lượt đăng ký subscription không tự phục hồi sau khi đứt kết nối mạng, vì vậy một client khi âm thầm kết nối lại sẽ không còn theo dõi topic nào trong khi bề ngoài trông vẫn như đang kết nối bình thường. Màn hình sẽ giữ nguyên giá trị cũ cho đến khi có hành động re-subscribe.
