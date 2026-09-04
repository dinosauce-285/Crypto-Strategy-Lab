# Các bảng phản ánh đúng contract, Postgres chỉ ràng buộc những gì hệ thống type không thể

## Why this (Lý do lựa chọn)

Mỗi cấu trúc dữ liệu trong `@csl/contracts` giờ đây cần một cột tương ứng trong cơ sở dữ liệu, và việc chuyển đổi này không đơn thuần là thao tác máy móc. Một `Timeframe` là một trong sáu chuỗi ký tự; một mức giá là một chuỗi thập phân; một timestamp là một số nguyên mili-giây. PostgreSQL có các kiểu dữ liệu riêng cho từng loại đó, và nếu áp dụng cứng nhắc các kiểu của Postgres ở mọi nơi thì các shared types và các bảng dữ liệu sẽ dần dần không còn mô tả cùng một thứ.

Quy tắc được chốt rất rõ ràng: **các bảng dữ liệu sao chép nguyên vẹn các contracts, và cơ sở dữ liệu chỉ bổ sung ràng buộc ở những nơi mà hệ thống kiểu TypeScript bất lực không thể tự đảm bảo**. Một kiểu dữ liệu TypeScript không thể khẳng định *dataset của thử nghiệm này có thực sự tồn tại trong DB hay không*, hoặc *ứng viên này đã từng được kiểm thử hay chưa*, hoặc *hai giao dịch này không được cùng mang số thứ tự #3*. Những điều đó trở thành các khóa ngoại (foreign keys) và unique indexes trong PostgreSQL. Ngược lại, một TypeScript type hoàn toàn có thể đảm bảo *timeframe bắt buộc phải là một trong sáu chuỗi ký tự cố định* — vì vậy tầng database không cần can thiệp vào việc đó.

Bốn hệ quả kỹ thuật kéo theo:

**Các danh sách hữu hạn (closed lists) được lưu dưới dạng cột `String`.** Các trường `Timeframe`, `EntryPrice`, `DrawdownMode`, `StrategyGroup`, trạng thái experiment, chiều trade và nhãn sentiment đều là `String`. Định nghĩa Enum trong Postgres sẽ là một bản khai báo danh sách thứ hai lặp lại những gì đã có trong package contracts, phải duy trì đồng bộ thủ công — điều mà ADR `0012` đã thẳng thừng từ chối. Hơn nữa, ba trong số bảy danh sách không thể đặt tên trực tiếp làm định danh Prisma: `1m` bắt đầu bằng chữ số, `signal-close` và `per-candle` chứa dấu gạch nối. Chúng sẽ cần dùng `@map`, khiến mã client phải gọi `m1` trong khi contract ghi `'1m'`, buộc mọi repository phải duy trì bảng ánh xạ hai chiều phức tạp.

**Mốc thời gian lưu dạng `timestamptz(3)`, và chuyển thành epoch milliseconds tại ranh giới repository.** Package contracts dùng số nguyên mili-giây (`number`) vì đây là định dạng truyền qua WebSocket và hàng đợi BullMQ mượt mà nhất. Kiểu `BigInt` thoạt nhìn có vẻ trung thực với cột số, nhưng Prisma trả về kiểu `bigint` của JavaScript — kiểu này không hỗ trợ `JSON.stringify` và không so sánh trực tiếp được với `number`, dẫn đến bẫy lỗi tuần tự hóa. Kiểu `timestamptz` chỉ chuyển đổi một lần duy nhất tại repository, đổi lại database có thể quét chỉ mục theo khoảng thời gian cực nhanh, và con người mở bảng ra xem sẽ thấy ngày giờ rõ ràng thay vì một dãy số nguyên 13 chữ số.

**Mức giá lưu dạng `Decimal(38,18)`; tỷ lệ lưu dạng `double`.** Contracts lưu giá dưới dạng chuỗi decimal chính xác để không bao giờ bị làm tròn trước khi lưu vào DB, và cột Float sẽ phá hủy độ chính xác đó ở bước cuối cùng. Ngược lại, tỷ lệ thắng (win rate), tổng lợi nhuận và drawdown là các con số so sánh phái sinh không đòi hỏi bảo toàn tuyệt đối từng số thập phân, nên lưu dưới dạng float không tốn kém gì.

**Các chỉ số hiệu suất là các cột riêng biệt, không gom vào blob JSON.** Bảng xếp hạng leaderboard thực hiện câu lệnh `ORDER BY` trực tiếp trên các chỉ số này (ADR `0011`) — và việc sắp xếp trên một trường JSON sẽ khiến database không thể tận dụng index và câu truy vấn không có type an toàn. Tất cả các cột này đều chấp nhận giá trị `null` (nullable), vì một lượt chạy thất bại sẽ không có chỉ số nào, và nếu gán số 0 thì sẽ là một sự giả dối mà bảng xếp hạng không thể phân biệt được với một chiến lược chạy hòa vốn.

Bảng `Candle` không có cột `closed`: chỉ những cây nến đã đóng mới được lưu vào database, còn cây nến đang hình thành thì nằm trên WebSocket. Bảng `Dataset` có unique index trên toàn bộ 9 cột của nó, ngăn chặn việc hai dòng mô tả cùng một khung thời gian với cùng quy tắc phán quyết làm xé lẻ bảng xếp hạng thành hai bản trông có vẻ hoàn chỉnh.

## What else we looked at (Các phương án khác đã cân nhắc)

**Prisma Enums kết hợp `@map`** — phiên bản mà database từ chối các giá trị sai ngay lập tức. Nhưng nó mua một sự đảm bảo vốn đã được giữ chặt ở tầng TypeScript ngay phía trên, và bắt mọi repository phải viết code ánh xạ thủ công.

**Lưu các chỉ số metrics bên trong trường JSON `spec`** — ít cột hơn, và việc thêm chỉ số Sharpe sau này không cần migration. Nhưng nó đặt khóa sắp xếp của leaderboard vào bên trong một blob JSON, điều tối kỵ về hiệu năng.

**Tạo bảng `Leaderboard` riêng** — đề bài mục 35 từng liệt kê nó như một nhóm dữ liệu thứ sáu. ADR `0011` đã quyết định không lưu cứng thứ hạng, và schema này là nơi quyết định đó được thực thi kiên định.

## Trade-offs (Đánh đổi)

Lỗi chính tả có thể lọt vào bảng dữ liệu nếu viết raw SQL. `timeframe: '5mm'` sẽ bị từ chối bởi TypeScript và validator của contracts, nhưng nếu một câu lệnh SQL thô ghi thẳng vào bảng thì database sẽ không ngăn cản.

Timestamp phải chuyển đổi hai lần trên mỗi lượt đọc và ghi, được viết bằng tay trong từng repository.

Ràng buộc `@@unique([datasetId, specHash])` đồng nghĩa với việc một ứng viên đã thất bại không thể chỉ đơn giản là chạy lại — dòng dữ liệu cũ bắt buộc phải được xóa trước. Điều này đúng với một đặc tả chứa chiến lược không tồn tại (lỗi vĩnh viễn), nhưng sẽ cần xử lý khéo léo đối với một job chết do worker bị crash đột ngột.

Toàn bộ 5 quy tắc backtest đều là các cột dữ liệu, vì vậy thêm quy tắc thứ sáu sau này sẽ cần chạy migration, và các dataset cũ sẽ không có thông tin về giá trị mặc định của quy tắc mới.
