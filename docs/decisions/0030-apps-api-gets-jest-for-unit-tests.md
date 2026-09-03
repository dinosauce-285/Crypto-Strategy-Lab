# apps/api sử dụng Jest cho unit test

## Why this (Lý do lựa chọn)

Task T10 là phần đầu tiên trong `apps/api` thuần túy là tính toán toán học không có cơ sở dữ liệu, không có hàng đợi, không gọi sàn và không có màn hình trình duyệt để đối chiếu kiểm tra — các chỉ báo MA, RSI, Bollinger Bands và Hỗ trợ/Kháng cự là các hàm nhận nến vào và trả về các mảng số. Thẻ nhiệm vụ của nó nêu rõ: xây dựng và unit test độc lập, chưa có endpoint nào để áp dụng quy tắc kiểm tra "gọi endpoint một lần" thông thường của `BACKEND_CONSTRAINT.md`. Khi đó monorepo này chưa có bất kỳ test runner nào, vì vậy quyết định này không phải là "chọn tính năng test nào" mà là "chọn framework kiểm thử nào".

Jest là lựa chọn mặc định tích hợp sẵn trong cấu trúc khởi tạo của NestJS và là framework mà mọi tài liệu hướng dẫn chính thức của NestJS đều mặc định sử dụng. Mặc dù `IndicatorService` và các bộ tính toán trong đợt này là các class và hàm thuần túy — không cần dùng `TestingModule` của `@nestjs/testing` mà có thể khởi tạo trực tiếp — nhưng phần còn lại của `apps/api` phụ thuộc sâu sắc vào `@Injectable()` và injection qua constructor, và ngày một bài test cần khởi động một module NestJS thật thì Jest là con đường mượt mà nhất không đòi hỏi cấu hình bổ sung.

## What else we looked at (Các phương án khác đã cân nhắc)

**Vitest** — nhanh hơn, hỗ trợ ESM tự nhiên, và là pattern mà monorepo này đã quen thuộc từ cấu hình Vite của `apps/web`. Mặc định Vitest biên dịch TypeScript qua esbuild, vốn không hỗ trợ các cờ `experimentalDecorators`/`emitDecoratorMetadata` theo cách mà `ts-jest` làm; khiến việc làm cho decorator metadata của NestJS chạy được dưới Vitest đòi hỏi thêm plugin bên ngoài (`unplugin-swc` hoặc tương đương). Đối với một codebase xây dựng hoàn toàn xoay quanh các class `@Injectable()`, chọn runner ít xung đột nhất với decorators là phương án an toàn hơn, dù chấp nhận một chuỗi công cụ cũ hơn một chút.

**Không dùng test runner nào — kiểm tra bằng script tự chạy tay** — không thêm dependency nào, và đề bài chỉ yêu cầu tính đúng đắn chứ không chấm điểm độ phủ coverage. Bị từ chối vì toàn bộ nhiệm vụ của `IndicatorService` là một tập hợp các điều kiện bất biến mà mắt người rất tệ trong việc kiểm tra lại: ranh giới nến warm-up, tính nhân quả (nến N có bao giờ nhìn trộm nến N+1 không?), và hành vi cache hit là những thứ rất dễ bị gãy âm thầm nếu thiếu các bài test tự động bảo vệ.

## Trade-offs (Đánh đổi)

Monorepo này giờ đây có hai môi trường công cụ khác nhau — Jest cho `apps/api`, và các công cụ khác cho `apps/web`. Đây là chi phí trực tiếp của việc tuân thủ mặc định của framework từng ứng dụng thay vì gượng ép dùng chung một runner duy nhất.

Cơ chế xử lý TypeScript của Jest (`ts-jest`) kiểm tra kiểu và biên dịch từng file lúc chạy, chậm hơn so với pipeline esbuild của Vitest. Với quy mô dự án hiện tại, sự chênh lệch này chưa đáng kể.
