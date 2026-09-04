# PostgreSQL cho toàn bộ dữ liệu, truy xuất thông qua Prisma

## Why this (Lý do lựa chọn)

Năm trong số sáu nhóm dữ liệu mà đề bài liệt kê là dữ liệu quan hệ thông thường với các mối quan hệ thực sự: một lượt thử nghiệm (experiment) trỏ đến một phiên bản chiến lược và một dataset, các giao dịch (trades) thuộc về một experiment, tin tức gắn liền với một đồng coin. Mục 36 yêu cầu một thử nghiệm cũ phải luôn biết chính xác phiên bản chiến lược nào đã tạo ra nó — khóa ngoại (foreign key) của cơ sở dữ liệu quan hệ sẽ tự động thực thi điều đó, trong khi một document store phi quan hệ sẽ để lại việc đó dưới dạng quy ước mà sớm muộn cũng sẽ có người quên kiểm tra.

Tính năng xếp hạng (ranking) là lý do quan trọng thứ hai. Nếu bảng xếp hạng được tính toán lại trực tiếp từ kết quả các experiment thay vì lưu tĩnh vào bảng, thì việc lấy Top-K chỉ là một câu truy vấn SQL duy nhất kết hợp nhóm dữ liệu (`GROUP BY`) và hàm cửa sổ (`WINDOW FUNCTION`). Đó là vài dòng lệnh viết một lần là xong, so với một pipeline aggregation phức tạp cần phải debug.

Thành phần thực sự không có cấu trúc cố định (schemaless) duy nhất trong hệ thống là bản đặc tả ứng viên (candidate specification) và các bộ tham số riêng của từng loại chiến lược. Cột dữ liệu kiểu `jsonb` giải quyết trọn vẹn điều này ngay bên trong mô hình quan hệ, mang lại sự linh hoạt đúng nơi cần thiết mà không phải đưa thêm một cơ sở dữ liệu NoSQL thứ hai chỉ để chứa một trường thông tin.

Khối lượng dữ liệu nến thực tế nhỏ hơn cảm giác ban đầu — khoảng 350.000 dòng cho một cặp coin trên 6 khung thời gian trong 6 tháng. Một index trên bộ ba trường (pair, timeframe, openTime) là hoàn toàn đủ đáp ứng, vì vậy một cơ sở dữ liệu chuỗi thời gian chuyên dụng (time-series database) sẽ là giải quyết một bài toán mà hệ thống không hề gặp phải, trong khi mục 38 của đề bài hỏi rất rõ: mỗi công nghệ đưa vào giải quyết bài toán kiến trúc cụ thể nào.

Chọn Prisma vì nó tự động sinh mã kiểu TypeScript từ schema, và các kiểu dữ liệu đó chảy thẳng vào package contracts dùng chung. Việc đổi tên một cột trong database mà quên sửa code sẽ biến thành lỗi biên dịch ngay lập tức — cùng một lập luận thuyết phục đã giúp việc đồng nhất một ngôn ngữ trở nên đáng giá. Các migration là các file được đánh phiên bản trong git, mở rộng tính tái lập của mục 36 lên chính schema cơ sở dữ liệu, và file schema đủ rõ ràng, súc tích để đưa trực tiếp vào tài liệu kiến trúc thay vì phải vẽ lại sơ đồ ERD thủ công rồi để nó bị lỗi thời theo thời gian.

## What else we looked at (Các phương án khác đã cân nhắc)

**SQLite** — không cần cài đặt service, rất hấp dẫn trong giai đoạn đầu. Nhưng nó thất bại ở một điểm chí mạng: SQLite khóa toàn bộ cơ sở dữ liệu khi ghi (write lock), vì vậy khoảnh khắc nhiều worker backtest cùng ghi kết quả song song, hệ thống sẽ bị tuần tự hóa và tắc nghẽn. Điều đó sẽ xảy ra ở lát cắt tìm kiếm (search slice), đồng nghĩa với việc chúng ta sẽ phải migrate database sau khi đã có dữ liệu thật — thời điểm tồi tệ nhất để làm việc này.

**MySQL** — hoàn toàn dùng được. Postgres thắng nhờ hỗ trợ kiểu `jsonb` hoàn thiện hơn và các hàm window functions mạnh mẽ cho việc xếp hạng, nhưng khoảng cách không quá lớn; nếu nhóm đã có sẵn MySQL đang chạy thì không đáng để đổi.

**MongoDB** — từ bỏ các ràng buộc khóa ngoại, và cùng với đó là cách đơn giản và rẻ nhất để thỏa mãn mục 36 của đề bài. Tính linh hoạt schema của MongoDB là có thật nhưng hệ thống chỉ cần linh hoạt ở đúng một cột, vốn đã được `jsonb` của Postgres bao phủ hoàn hảo.

**TimescaleDB hoặc InfluxDB** — là câu trả lời đúng ở quy mô hàng triệu giao dịch mỗi giây mà đồ án không bao giờ chạm tới. Đây là công nghệ mà chúng ta sẽ rất khó biện minh trước câu hỏi của mục 38 vì không có động lực kiến trúc thực tế nào bắt buộc phải dùng.

**TypeORM thay vì Prisma** — tích hợp tự nhiên hơn với Dependency Injection của NestJS vì entities và repositories có thể inject theo cách thông thường. Nhưng khả năng đảm bảo an toàn kiểu (type safety) của TypeORM lỏng lẻo hơn và cơ chế migration phức tạp hơn. Đánh đổi ở đây là sự tích hợp mượt mà lấy sự an toàn về kiểu dữ liệu, và chúng ta ưu tiên an toàn kiểu vì hợp đồng giữa các module chính là phần được chấm điểm.

**Drizzle thay vì Prisma** — hệ thống kiểu xuất sắc, gần với SQL thuần, nhẹ hơn. Nhưng thua kém về số lượng tài liệu và ví dụ thực tế, vốn là chi phí rủi ro lớn đối với một nhóm sinh viên phải tiếp cận công cụ mới dưới áp lực thời hạn nộp bài.

## Trade-offs (Đánh đổi)

Prisma xử lý chưa tối ưu ở các câu truy vấn SQL phức tạp và động. Câu truy vấn xếp hạng Top-K có khả năng sẽ phải dùng SQL thô (`$queryRaw`), điều mà Prisma có hỗ trợ nhưng nằm ngoài lớp bảo vệ an toàn kiểu — nơi duy nhất chúng ta tạm mất đi sự đảm bảo mà chúng ta đã chọn Prisma vì nó. Nếu hệ thống xuất hiện quá nhiều câu truy vấn dạng này, đây sẽ là quyết định cần phải xem xét lại.

PostgreSQL là một dịch vụ độc lập, không phải là một file nhúng. Mọi thành viên trong nhóm và mọi máy tính demo đều phải bật dịch vụ này lên, do đó hướng dẫn thiết lập và checklist demo đòi hỏi sự cẩn thận hơn so với việc dùng cơ sở dữ liệu nhúng. Đó là cái giá phải trả để hệ thống chịu được các worker chạy song song.
