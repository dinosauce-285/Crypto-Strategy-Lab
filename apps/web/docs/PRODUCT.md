# Định hướng Sản phẩm (Product)

<!-- impeccable:product-schema 1 -->

## Nền tảng (Platform)

Web (trình duyệt)

## Đối tượng người dùng (Users)

Hai nhóm đối tượng người dùng, và giao diện luôn ưu tiên phục vụ nhóm thứ hai khi có sự phân vân trong thiết kế:

1. **Người dùng nghiên cứu thị trường và chạy thử nghiệm:** theo dõi bốn biểu đồ trực tiếp trên các khung thời gian khác nhau, chọn dataset và danh sách các chiến lược, khởi chạy tiến trình tìm kiếm, và đọc kết quả trên bảng xếp hạng. Nhiệm vụ của họ là tìm ra liệu một tổ hợp chiến lược có giá trị hay không, và quan sát kết quả mà không cần phải hỏi lại hệ thống cùng một câu hỏi hai lần.
2. **Hội đồng giám khảo chấm thi trong buổi bảo vệ 15 phút, quan sát qua máy chiếu.** Nhiệm vụ của hội đồng là đánh giá **kiến trúc phần mềm**, không phải mức lợi nhuận — vì vậy màn hình phải làm nổi bật cấu trúc hệ thống một cách trực quan: dataset nào đang chạy, những chiến lược nào nằm trong không gian tìm kiếm, con số này bắt nguồn từ đâu. Những gì hội đồng không nhìn thấy được thì không thể cho điểm.

## Mục đích Sản phẩm (Product Purpose)

Một phòng thí nghiệm kết hợp các chiến lược giao dịch tiền mã hóa: cắm ghép các phương pháp phân tích, tự động kết hợp chúng, kiểm thử lịch sử từng tổ hợp, tính điểm đánh giá, xếp hạng và lặp lại tìm kiếm. Tiêu chí chấm điểm là *cần thay đổi ít vị trí thế nào khi thêm một chiến lược mới, thuật toán tìm kiếm mới hoặc sàn giao dịch mới* — do đó nhiệm vụ của frontend là chỉ render những gì hệ thống đã quyết định và tuyệt đối không tự ý quyết định bất kỳ điều gì. Thành công là một màn hình mà người lạ nhìn vào có thể hiểu được ngay mà không cần ai phải hướng dẫn từng bước.

## Định vị (Positioning)

Không phải là một sản phẩm giao dịch thực chiến và không phải là dịch vụ phím lệnh (signal service). Đây là một bàn thí nghiệm (bench) dùng để so sánh các tổ hợp chiến lược với nhau dưới cùng một tập dữ liệu cố định, và điểm vượt trội mà nó khẳng định so với các ứng dụng biểu đồ thông thường là **tính tái lập (reproducibility)**: mỗi thử nghiệm đều mang theo thông tin dataset và phiên bản chiến lược đã tạo ra nó, đảm bảo một kết quả từ ba tuần trước khi chạy lại vẫn ra đúng chính xác con số đó.

## Ngữ cảnh vận hành (Operating Context)

Môi trường phát triển cục bộ và một laptop demo cắm vào máy chiếu hội trường. Dữ liệu thị trường stream trực tiếp từ Binance; trình duyệt không bao giờ polling, server chủ động đẩy dữ liệu (push). Đồ án gồm 29 nhiệm vụ chia thành sáu lát cắt dọc (vertical slices), và một slice chỉ khép lại khi có một giao diện bấm được thay vì chỉ xong một tầng logic — vì vậy mỗi màn hình phải đứng vững độc lập trước khi màn hình tiếp theo bắt đầu.

## Năng lực và Ràng buộc (Capabilities and Constraints)

Giá trực tiếp và nến đóng truyền qua một kênh push phân định theo topic, và kênh này về sau cũng mang theo các thay đổi của bảng xếp hạng, tiến độ tìm kiếm và trạng thái vòng lặp. Các chiến lược được cắm ghép và tự động kết hợp; mỗi tổ hợp đều được backtest, tính điểm và xếp hạng.

Các ràng buộc đối với giao diện: không tính toán nghiệp vụ trong trình duyệt — không tính lợi nhuận, xếp hạng, tín hiệu hay tỷ lệ phần trăm bên trong React component. Mọi màu sắc phải lấy từ file token, không viết mã màu inline. Mỗi màn hình phải hiển thị đầy đủ 4 trạng thái. Kênh push không gửi lại những gì đã bỏ lỡ, do đó màn hình khi bị mất kết nối phải thông báo rõ ràng cho người dùng biết.

Những quyết định ban đầu: năm quy tắc backtest, công thức điểm tổng hợp và thư viện biểu đồ (T06). Giao diện tuyệt đối không được tự ý bịa ra các giá trị này.

## Cam kết Thương hiệu & Phong cách (Brand Commitments)

Chính xác, điềm tĩnh, không quảng cáo phô trương — mang phong cách một **terminal làm việc chuyên nghiệp** thay vì một phòng trưng bày bóng bẩy. Các con số dữ liệu là chủ thể trung tâm và mọi chi tiết trang trí khác đều phải lùi lại phía sau.

Giao diện mang vẻ quen thuộc như các công cụ tài chính chuyên nghiệp: nền tối (dark ground), một màu nhấn chủ đạo (amber), các bảng số liệu cô đọng. Sự quen thuộc này là có chủ đích nhằm tiết kiệm thời gian quý giá trong 15 phút thuyết trình — hội đồng không phải mất thời gian tìm kiếm xem các nút nằm ở đâu. Tuy nhiên, sự quen thuộc không được sao chép tính chất tiêu cực của các sàn giao dịch: Đây là một phòng thí nghiệm, không phải sòng bạc: không có hiệu ứng chúc mừng, không đếm ngược hối thúc, không chúc tụng, và không con số nào được phóng to chỉ vì nó là tin vui.

Hai hình mẫu tiêu cực bị cấm triệt để:

**Sàn giao dịch crypto lòe loẹt (Neon crypto exchange).** Dải màu gradient tím - lục lam, các con số nhấp nháy, huy hiệu lấp lánh, tạo cảm giác một sòng bạc casino. Đây là cái bẫy gần nhất và là cách nhanh nhất khiến dự án trông không đáng tin cậy về mặt tài chính.

**Ứng dụng đầu tư cho người mới bắt đầu (Beginner investing app).** Màu xanh đỏ quá khổ, mũi tên nhấp nháy, tỷ lệ phần trăm phóng to, các yếu tố thúc giục tâm lý. Nó biến một phòng thí nghiệm khoa học thành một trò chơi và làm cho kết quả backtest trông như lời khuyên đầu tư tài chính.

## Bằng chứng thực tế (Evidence on Hand)

Dữ liệu thị trường thật từ Binance, truyền trực tiếp. Các bản ghi quyết định kiến trúc chuẩn mực trong `docs/decisions/` giải thích cặn kẽ tại sao từng thành phần lại có hình hài như vậy. Không có khách hàng hư cấu, không có lời chứng thực giả, không có con số benchmark tự chế, không có lịch sử giao dịch ảo — những thứ đó không có thật và không bao giờ được phép tự bịa ra để đưa lên màn hình.

## Nguyên tắc Sản phẩm (Product Principles)

**Con số là chủ thể trung tâm (The number is the subject).** Các chi tiết khung viền phải lùi lại. Nếu một đường viền, một thẻ card hay bóng đổ không giúp người dùng đọc số liệu dễ hơn hoặc tìm nút bấm nhanh hơn, nó không có lý do để tồn tại.

**Hiển thị rõ nguồn gốc sinh ra kết quả (Show what produced it).** Một chỉ số hiệu suất thiếu thông tin dataset và phiên bản chiến lược thì không phải là bằng chứng. Khả năng tái lập là tiêu chí được chấm điểm, vì vậy nguồn gốc xuất xứ (provenance) phải nằm ngay cạnh kết quả trên màn hình, không giấu trong tooltip.

**Màn hình mất kết nối tuyệt đối không được giả vờ như đang trực tiếp (A stale screen must never look live).** Giao diện phải thông báo rõ khi nào đang kết nối, khi nào đang chờ, và khi nào đã mất luồng dữ liệu. Phải phân biệt rõ ràng giữa việc "hệ thống bị đứt kết nối" và "thị trường đang yên ắng".

**Đọc rõ ràng từ phía cuối phòng (Readable from the back of the room).** Khi phân vân về mật độ hiển thị, ưu tiên khả năng nhìn rõ trên máy chiếu. Toàn bộ cơ hội để hội đồng hiểu hệ thống chỉ gói gọn trong 15 phút.

**Trình duyệt không bao giờ tính toán (The browser never computes).** Nếu cần một con số mà API chưa trả về, nơi phải sửa là API, không phải viết code tính toán trong React.

## Khả năng Tiếp cận & Toàn diện (Accessibility & Inclusion)

Tiêu chuẩn WCAG AA: độ tương phản tối thiểu 4.5:1 cho văn bản nội dung và placeholder, 3:1 cho văn bản lớn. Màu sắc không bao giờ là phương tiện duy nhất để truyền đạt ý nghĩa — mua và bán, lời và lỗ, tăng và giảm phải phân biệt được dưới thang xám thông qua hình dạng biểu tượng, vị trí hoặc nhãn chữ. Mọi hiệu ứng chuyển động đều có phương án thay thế hỗ trợ `prefers-reduced-motion: reduce`. Chiều cao điều khiển đồng nhất trên mỗi hàng, thống nhất một bộ icon, và con trỏ focus luôn hiển thị rõ ràng.
