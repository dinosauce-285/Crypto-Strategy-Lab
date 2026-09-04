# TypeScript trên cả hai đầu: NestJS backend, React + Vite frontend

## Why this (Lý do lựa chọn)

Sử dụng cùng một ngôn ngữ cho cả frontend và backend cho phép các kiểu dữ liệu dùng chung (shared types) cùng nằm trong một package mà cả hai phía đều import được. Các thực thể `Candle`, `Signal`, `CandidateStrategy`, `Trade` và `NewsItem` không còn là một tài liệu thỏa thuận trên giấy mà mọi người tự giác làm theo, mà trở thành thứ được trình biên dịch (compiler) kiểm tra chặt chẽ. Đối với một đồ án mà điểm số phụ thuộc lớn vào hợp đồng giao tiếp giữa các module, điều này biến nhóm lỗi đắt giá nhất thành lỗi compile ngay lúc build.

Chọn NestJS vì framework này đã tích hợp sẵn những mô hình mà đề bài yêu cầu. Mục 12 trong đề bài yêu cầu nghiên cứu Strategy Pattern, Plugin Architecture, Factory, Registry và Dependency Injection; NestJS cung cấp sẵn DI container và hệ thống module hoàn chỉnh, nhờ đó registry trở thành một provider, bộ sinh ứng viên trở thành một injection token, và việc hoán đổi thuật toán tìm kiếm ngẫu nhiên (random search) sang tìm kiếm định hướng miền (domain-guided) chỉ là một dòng code trong khai báo module. Khi giảng viên chạy kịch bản kiểm tra ở mục 42, chúng ta chỉ cần đổi dòng đó mà không làm ảnh hưởng đến bất kỳ thành phần nào phía sau. Các khai báo `@Module` cũng chính là sự phân rã container mà mục 45 yêu cầu trong tài liệu kiến trúc, đảm bảo sơ đồ kiến trúc không bao giờ bị lệch so với code thực tế.

Ranh giới module của NestJS được thực thi bằng mã nguồn thay vì chỉ thỏa thuận miệng: nếu một module không export một service, không thành phần nào bên ngoài có thể inject nó. Quy tắc phụ thuộc một chiều của chúng ta không còn là lời nhắc nhở lúc review code mà trở thành một lỗi runtime nếu vi phạm.

Chọn Vite vì tốc độ của vòng lặp phát triển cục bộ (development loop) rất quan trọng — việc hiển thị 4 biểu đồ chạy trực tiếp qua WebSocket đồng nghĩa với việc reload liên tục, và khả năng khởi động tức thì cùng Hot Module Replacement (HMR) giữ nguyên trạng thái sẽ tích lũy tiết kiệm rất nhiều thời gian trong suốt học kỳ. Một ứng dụng SPA thuần túy cũng giúp tuân thủ dễ dàng quy tắc ở mục 44: trình duyệt chỉ render những gì backend đã tính toán, vì logic không còn chỗ nào khác để ẩn nấp.

## What else we looked at (Các phương án khác đã cân nhắc)

**Python kết hợp FastAPI** — phương án thay thế mạnh mẽ nhất. Thư viện Pandas giúp việc xử lý số liệu nhanh hơn cả về tốc độ viết lẫn tốc độ chạy, và mô hình phân tích cảm xúc sentiment sẽ nằm trong cùng ngôn ngữ với phần còn lại. Tuy nhiên, nó đánh mất lợi thế chia sẻ kiểu dữ liệu trực tiếp giữa frontend và backend, và ranh giới giữa các module trong Python mang tính quy ước hơn là thực thi chặt chẽ. Nếu cả nhóm thành thạo Python hơn thì đây sẽ là lựa chọn phù hợp và câu chuyện kiến trúc vẫn được bảo toàn phần lớn.

**Express** — dễ học hơn và hoàn toàn đủ khả năng xử lý. Nhưng registry và việc nối dây phụ thuộc (dependency wiring) sẽ phải tự viết tay hoàn toàn, đồng nghĩa với việc khi bảo vệ đồ án nhóm sẽ phải mất thời gian giải thích cơ chế tự chế của mình thay vì chỉ vào một chuẩn kiến trúc có sẵn. Đó là vị thế bất lợi hơn đối với môn học kiểm tra về kiến trúc phần mềm.

**Java với Spring, hoặc .NET** — có thể xem là phù hợp nhất với thang điểm lý thuyết; câu chuyện DI và module thậm chí còn mạnh mẽ hơn. Nhưng chi phí học và cấu hình quá lớn đối với nhóm sinh viên trong một học kỳ: thời gian sẽ bị tiêu tốn vào cấu hình boilerplate thay vì giải quyết trọn vẹn 29 nhiệm vụ của đề bài.

**Next.js thay vì Vite** — Render phía server (SSR) không giải quyết được vấn đề gì ở đây. Đồ án không có yêu cầu SEO và toàn bộ dữ liệu đều chạy realtime theo phiên làm việc, do đó Next.js chỉ làm phức tạp thêm tầng server mà không có lý do kiến trúc nào biện minh. Tệ hơn nữa, Server Actions tạo kẽ hở cho logic nghiệp vụ rò rỉ vào frontend, vốn là anti-pattern thứ ba trong mục 44.

**Vue hoặc Svelte thay vì React** — Về mặt kỹ thuật là tương đương nhau. Thư viện vẽ biểu đồ hoạt động theo cơ chế imperative, do đó framework UI không tạo ra sự khác biệt lớn. React thắng nhờ số lượng ví dụ tích hợp TradingView phong phú và sự quen thuộc sẵn có của các thành viên trong nhóm.

## Trade-offs (Đánh đổi)

NestJS có độ dốc học tập thực sự — decorators, modules, providers, injection tokens. Sẽ mất hai đến ba ngày làm quen đối với thành viên trước đây chỉ dùng Express. Chi phí này tập trung ở lát cắt nền tảng ban đầu (slice 0), do một người phụ trách nên không làm nghẽn tiến độ của người khác; nhưng đây là chi phí thực tế và nó đánh đổi lấy chất lượng kiến trúc thay vì tính năng bề nổi. Với một đồ án chỉ chấm điểm tính năng thì đây sẽ là sự đánh đổi sai lầm.

Việc chọn TypeScript thông thường sẽ đẩy mô hình sentiment sang một runtime thứ hai, vì hệ sinh thái AI/ML chủ yếu nằm ở Python. Việc gọi API một mô hình hosted (Groq) giúp tránh được điều đó, giữ cho toàn bộ dự án đồng nhất một ngôn ngữ từ đầu đến cuối — nhưng nó đánh đổi một mô hình chạy local lấy một phụ thuộc mạng bên ngoài, điều này được ghi nhận riêng trong một bản ghi quyết định khác.

Vòng lặp tính toán số học trong TypeScript chậm hơn Pandas được tối ưu vector. Việc cache chỉ báo theo bộ tham số sẽ giúp các lượt backtest vận hành mượt mà ở quy mô yêu cầu, nhưng nếu việc backtest trở thành nút thắt cổ chai về hiệu năng thì quyết định này chính là nguồn gốc ban đầu của sự đánh đổi đó.
