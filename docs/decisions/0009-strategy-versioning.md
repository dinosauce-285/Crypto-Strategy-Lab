# Chiến lược được đóng dấu hai lần: version đặt tay cho code, hash cho bộ tham số

## Why this (Lý do lựa chọn)

Một dòng dữ liệu trong bảng `Experiment` ghi nhận một ứng viên đạt mức lợi nhuận 18%. Nhiều tuần sau, dòng dữ liệu đó bắt buộc phải trả lời được câu hỏi: đoạn mã nguồn nào đã tạo ra con số đó, nếu không bảng xếp hạng sẽ chỉ là một cột số liệu mà không ai biết nguồn gốc xuất xứ từ đâu. Mục 36 yêu cầu điều này trực tiếp và câu hỏi 8 của mục 40 một lần nữa kiểm tra nó.

Có hai thành phần hoàn toàn khác nhau bị thay đổi, và chúng thay đổi bởi những bàn tay khác nhau. Các tham số được lựa chọn bởi search engine — vòng này dùng RSI 14, vòng sau dùng RSI 21 — hàng nghìn lần mỗi đêm mà không cần con người can thiệp. Còn mã nguồn logic bên trong chiến lược được chỉnh sửa bởi lập trình viên: công thức RSI chuyển sang làm mượt kiểu Wilder, cách xử lý một cây nến không có khối lượng giao dịch volume thay đổi. Vì vậy con dấu định danh bắt buộc phải là hai con dấu độc lập:

Trường `paramsHash` đại diện cho nửa phần việc của máy móc. Các tham số của từng thành viên được chuẩn hóa và băm tự động, không ai phải gõ tay bất kỳ thứ gì. Trường `version` đại diện cho nửa phần việc của con người: một số nguyên nằm ngay trong metadata của chiến lược, cách vài dòng so với đoạn mã được chỉnh sửa, và được tăng giá trị (bump) trong cùng một commit với thay đổi đó.

Chỉ một trong hai là không bao giờ đủ. Nếu chỉ băm tham số (hash), hệ thống sẽ hoàn toàn mù tịt trước một thay đổi công thức tính toán mà giữ nguyên bộ tham số, khiến hai lượt chạy cho kết quả lệch nhau 7% lại mang cùng một mã định danh — một dạng lỗi âm thầm nguy hiểm nhất. Nếu chỉ dùng phiên bản đặt tay (version), chúng ta sẽ phải dựa vào việc con người nhớ tăng version mỗi khi một tham số thay đổi, điều mà chắc chắn không ai nhớ nổi. Phân chia theo cách này giao cho con người đúng nửa phần việc mà máy móc không thể tự suy luận, và không hơn.

Cơ chế kỹ thuật kéo theo rất rõ ràng: Bảng `Strategy` là bảng chỉ ghi thêm (append-only) trên cặp khóa `(id, version)` — registry đọc metadata của từng chiến lược khi khởi động server và chèn thêm một dòng nếu cặp khóa đó là mới, nhờ đó `rsi v1` vẫn nằm nguyên vị trí cũ khi `rsi v2` xuất hiện. Một experiment lưu trữ version và hash **theo giá trị (by value)** cho từng thành viên của đặc tả ứng viên, bởi vì ADR `0007` yêu cầu một bản đặc tả phải tự chứa đủ mọi thông tin định danh lượt chạy mà không bị phụ thuộc vào một bảng dữ liệu có thể bị chỉnh sửa sau này. Thứ tự thành viên, thứ tự khóa và độ chính xác số thực đều được chuẩn hóa trước khi băm, nếu không cùng một ứng viên sẽ xuất hiện dưới hai định danh khác nhau và bị test lặp lại hai lần.

Quy chuẩn chuẩn hóa đó được quy định rõ ràng: Các khóa thuộc tính (keys) của object được sắp xếp theo bảng chữ cái; các thành viên (members) được sắp xếp theo id, sau đó đến version, rồi đến parameter hash; một trường tùy chọn bị vắng mặt sẽ được bỏ qua hoàn toàn thay vì ghi là null; và mọi số thực đều được làm tròn đến **sáu chữ số thập phân (6 decimal places)** trước khi ghi. Con số 6 được chọn dựa trên các tham số thực tế chứ không phải số thực nói chung — các trọng số và ngưỡng quyết định nằm trên lưới bước nhảy 0.1 theo ADR `0007`, và không chiến lược nào khai báo tham số chi tiết hơn một phần nghìn — do đó nó đủ sâu để không bao giờ cắt bớt một giá trị thật, và đủ nông để triệt tiêu sai số dấu phẩy động giữa hai cách tính toán khác nhau.

Dạng chuẩn hóa (canonical form) là một chuỗi string, và việc chuyển nó thành mã hash SHA-256 là một bước tách biệt. Cấu trúc này giúp logic chuẩn hóa có thể nằm ngay bên cạnh bản đặc tả trong package `@csl/contracts` dùng chung mà không phải kéo thêm thư viện mã hóa nặng nề vào gói bundle của trình duyệt vốn chỉ import package này để lấy types.

Yếu tố giúp con người tự giác tăng version là một bộ kiểm thử chuẩn (golden test) cho từng chiến lược: một tập nến cố định kèm kết quả đầu ra kỳ vọng lưu sẵn. Nếu sửa công thức mà quên tăng version, bài test sẽ báo đỏ ngay tại cổng kiểm soát pre-push gate của git. Sự nhắc nhở diễn ra hoàn toàn tự động bằng máy móc dù con số do con người điền.

## What else we looked at (Các phương án khác đã cân nhắc)

**Băm nội dung file chiến lược hoặc băm commit git của bản build** — câu trả lời tự nhiên cho câu hỏi "tại sao phải tin tưởng con người", và nó loại bỏ hoàn toàn khả năng quên. Nhưng nó thua ở ba điểm: Mã định danh sẽ trở thành một chuỗi hex khó đọc dạng `7b2e4f…` thay vì `v2`, rất khó theo dõi trên bảng xếp hạng và bất tiện khi thuyết trình bảo vệ đồ án. Việc đổi tên biến hay format lại code sẽ vô tình tạo ra một định danh mới cho một chiến lược hoạt động hoàn toàn y hệt, làm rác cơ sở dữ liệu với những phân biệt vô nghĩa. Và nó vẫn bị mù ở một điểm cốt lõi: nếu sửa một hàm tiện ích dùng chung mà chiến lược gọi đến thì bản thân file chiến lược không hề thay đổi, dẫn đến mã hash không đổi. Tự động hóa con dấu không loại bỏ được việc phải suy nghĩ thấu đáo điều gì thực sự được coi là một thay đổi logic.

**Chỉ dùng version đặt tay, không dùng hash tham số** — ít trường dữ liệu hơn, và số phiên bản do con người kiểm soát hoàn toàn. Nhưng nó đẩy phần tham số trở lại cho con người, nơi nó sẽ bị lãng quên đầu tiên: search engine thử nghiệm hàng nghìn bộ tham số mỗi đêm, không con người nào có thể cập nhật version kịp.

**Chỉ dùng hash tham số, không có version mã nguồn** — mọi thứ tự động, không cần nhớ gì. Nhưng nó không thể phân biệt hai lượt chạy của cùng một bộ tham số trên hai phiên bản mã nguồn khác nhau — trường hợp cốt lõi mà quyết định này sinh ra để giải quyết.

**Khóa ngoại từ bảng experiment trỏ đến dòng `Strategy`** — chuẩn hóa cơ sở dữ liệu quan hệ. Bị từ chối vì khóa ngoại trỏ vào một dòng vẫn có thể bị chỉnh sửa, khiến bản đặc tả mất đi tính độc lập khép kín (self-contained), trong khi ADR `0007` yêu cầu đặc tả phải tự đứng vững.

## Trade-offs (Đánh đổi)

Con dấu mã nguồn vẫn phụ thuộc vào tính kỷ luật của con người. Bộ golden test bắt được các thay đổi làm lệch kết quả trên tập nến mẫu cố định, nhưng không bắt được thay đổi nằm ở một nhánh logic mà tập nến mẫu không chạm tới — ví dụ cách xử lý một cửa sổ dữ liệu trống. Khoảng trống đó là có thật và không có cách nào rẻ hơn để bịt kín hoàn toàn.

Mỗi chiến lược khi viết ra trong task T11 bắt buộc phải tạo kèm một tệp fixture dữ liệu mẫu golden test. Hai trường thông tin (`version` và `paramsHash`) phải được lưu trữ và hiển thị thay vì một.

Một version giúp định danh một lượt chạy trong quá khứ; nó không giúp ứng dụng tự động chạy lại phiên bản code cũ đó trên môi trường hiện tại. Mã nguồn của `v1` không còn tồn tại trong thư mục làm việc sau khi ai đó đã sửa file, vì vậy danh sách chọn chỉ hiển thị phiên bản hiện hành và việc chạy lại một thử nghiệm cũ sẽ chạy trên mã nguồn hôm nay và cho ra con số khác. Muốn tái hiện lại chính xác hành vi cũ bắt buộc phải checkout lại commit git tương ứng. Đó là phạm vi trung thực của cam kết kiến trúc: kết quả cũ có thể truy vết và phân biệt rõ ràng, không phải là tự động thực thi lại đa phiên bản mã nguồn cùng lúc.

Quy tắc làm tròn 6 chữ số thập phân có thể bị giới hạn nếu sau này có chiến lược đòi hỏi độ mịn cao hơn một phần triệu. Việc thay đổi quy tắc này sau này sẽ làm thay đổi toàn bộ mã băm của mọi ứng viên từng được tạo ra, vì vậy các thử nghiệm đã lưu chỉ giữ nguyên giá trị chừng nào quy tắc này được duy trì nhất quán.
