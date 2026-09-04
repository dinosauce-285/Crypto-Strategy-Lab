# Chiến lược ứng viên luân chuyển dưới dạng dữ liệu đặc tả, chỉ khởi tạo thành object khi chạy

## Why this (Lý do lựa chọn)

Một ứng viên (candidate) là một bản đặc tả (specification) thuần túy — bao gồm những chiến lược nào, tham số gì, trọng số bao nhiêu, quy tắc kết hợp nào — và một xưởng khởi tạo (factory) sẽ chuyển bản đặc tả đó thành một đối tượng chiến lược có thể thực thi được bên trong tiến trình worker chuẩn bị chạy backtest. Đối tượng thực thi đó không bao giờ được lưu vào cơ sở dữ liệu và không bao giờ được truyền qua mạng.

Quyết định này thực tế đã được định hình từ ADR `0004`. Công việc đến với worker thông qua hàng đợi, và mọi thứ đi qua hàng đợi đều phải được tuần tự hóa (serialised). Các phương thức của một JavaScript object nằm trên prototype chứ không nằm trong các trường dữ liệu, do đó khi tuần tự hóa một object thì các con số được giữ lại nhưng hành vi phương thức bị mất sạch; worker nhận về một cái vỏ rỗng và sẽ ném lỗi ngay khi bị gọi. Giữ ứng viên dưới dạng object đang sống đồng nghĩa với việc bắt buộc mọi thứ phải chạy trong một tiến trình duy nhất, tức là chỉ có một worker, từ bỏ hoàn toàn năng lực xử lý song song mà mục 43 của đề bài xây dựng xung quanh.

Yếu tố biến bản đặc tả trở thành hình thái vượt trội chứ không chỉ là giải pháp tình thế là có tới ba tác vụ cùng cần đến cùng một cấu trúc dữ liệu: Mục 15 sinh ra các ứng viên, mục 24 đẩy chúng qua hàng đợi tới các worker, và mục 35 lưu trữ chúng vào một dòng trong bảng `Experiment`. Một bản đặc tả duy nhất phục vụ trọn vẹn cả ba tác vụ mà không cần chuyển đổi, và tác vụ thứ ba chính là câu trả lời xuất sắc cho mục 36 và câu hỏi 8 của mục 40: một kết quả cũ không chỉ ghi lại tên chiến lược, nó ghi lại toàn bộ công thức chi tiết, giúp tái lập lại chính xác thử nghiệm đó sau nhiều tháng. Tiến trình worker đã chứa sẵn toàn bộ mã nguồn của mọi chiến lược — nó chạy cùng một chương trình — thứ duy nhất nó thiếu chỉ là lắp ráp những chiến lược nào với những con số tham số nào.

Hai chi tiết để ngỏ trước đây nay được chốt chặt chẽ khi đã có hàng đợi: Bộ kiểm tra tính hợp lệ (validator) chạy ở **đầu nhận (receiving end)**, bên trong worker, ngay trước khi bản đặc tả được khởi tạo thành object. Đầu gửi không thể là nơi kiểm tra vì không có duy nhất một đầu gửi: hôm nay là bộ sinh tự động đẩy ứng viên vào hàng đợi, ngày mai là người dùng thử lại bằng tay, và validator ở đầu gửi chỉ bảo vệ được những bên nhớ gọi nó. Worker là nơi giá trị untyped được hiện thực hóa thành object, vì vậy đó là nơi duy nhất việc kiểm tra mang lại giá trị thực sự.

Và một bản đặc tả bị validator từ chối sẽ được **ghi nhận là một thử nghiệm thất bại (failed experiment)** vào cơ sở dữ liệu, không bị âm thầm vứt bỏ. Mục 32.7 hỏi có bao nhiêu job bị thất bại, và một câu trả lời chắp vá từ các dòng log console không phải là một câu trả lời chuẩn mực. Dòng dữ liệu này chỉ tốn thêm một lệnh insert trên đường dẫn vốn đã liên tục ghi dữ liệu, mang theo lý do lỗi trong cột mà migration T03 đã chuẩn bị, và đảm bảo số lượng thất bại cùng kết quả thành công đều đến từ cùng một bảng dữ liệu thay vì hai nguồn độc lập có thể sai lệch nhau.

Dataset được tách biệt khỏi bản đặc tả có chủ đích. Bản đặc tả trả lời câu hỏi chiến lược là gì; dataset trả lời câu hỏi nó đã chạy trên dữ liệu nào. Chúng được gửi đi cùng nhau như một cặp và lưu vào hai cột riêng biệt. Nếu gộp dataset vào trong đặc tả, cùng một chiến lược chạy trên hai khoảng thời gian khác nhau sẽ bị coi là hai chiến lược hoàn toàn khác biệt, và phá hủy khả năng so sánh xem một ứng viên hoạt động tốt hơn trên khung 5 phút hay 1 giờ — vốn là một trong những câu hỏi thú vị nhất mà hệ thống có thể trả lời.

## What else we looked at (Các phương án khác đã cân nhắc)

**Giữ nguyên object đang sống (live object)** — không cần tuần tự hóa, không cần xưởng dựng lại, không có khoảng cách giữa thứ sinh ra và thứ chạy. Cách này chạy tốt, và sẽ là lựa chọn hiển nhiên nếu vòng lặp tìm kiếm chạy trong một tiến trình đơn lẻ. Nhưng nó không thể đi qua hàng đợi Redis, không thể lưu vào cột cơ sở dữ liệu, và không thể tái hiện lại trong tương lai, vì vậy nó thất bại trước cả ba tác vụ cốt lõi ở trên.

**Một object có thể tuần tự hóa với các phương thức được gắn lại sau khi truyền tải** — gửi các trường dữ liệu, sau đó gắn lại prototype ở phía bên kia. Đây thực chất là mô hình đặc tả + factory khoác một chiếc áo khác, với việc tái tạo bị giấu bên trong type thay vì được tuyên bố như một bước xử lý tường minh. Nó tốn chi phí y hệt nhưng khó giải thích kiến trúc hơn.

**Lưu trữ mã nguồn được sinh tự động cho từng ứng viên** — trung thực tối đa với những gì đã chạy. Nhưng nó biến mỗi lượt backtest thành việc thực thi mã nguồn động đọc từ database (eval/dynamic execution), tạo ra một lỗ hổng bảo mật nghiêm trọng không đáng có, và khiến việc so sánh hai ứng viên trở thành việc so khớp diff văn bản thay vì so sánh các trường tham số.

## Trade-offs (Đánh đổi)

Trình biên dịch (compiler) mất đi sự bảo vệ tại ranh giới hàng đợi. Dữ liệu đến từ hàng đợi không có kiểu dữ liệu lúc runtime (untyped), và việc ép kiểu kiểu TypeScript không kiểm tra được gì trong thực tế. Một validator bắt buộc phải được viết tay và duy trì đồng bộ thủ công với shared types, và một bản đặc tả sai cấu trúc chỉ được phát hiện khi nó được khởi tạo thay vì lúc được viết ra.

Kiểm tra hợp lệ ở đầu nhận đồng nghĩa với việc một bản đặc tả lỗi chỉ bị bắt sau khi nó đã nằm trong hàng đợi, chờ đợi và được worker bốc lên. Bộ sinh tạo ra nó lúc đó đã hoàn thành xong từ lâu, và thứ duy nhất truy ngược lại được là lý do lỗi lưu trên dòng thất bại.

Việc ghi nhận một bản đặc tả bị từ chối cũng phụ thuộc vào việc nó có mang theo một datasetId hợp lệ hay không, vì một experiment là một dòng trỏ đến dataset. Một job bị hỏng nặng đến mức mất luôn thông tin dataset sẽ không có nơi nào để ghi vào DB và chỉ có thể đếm tạm trong bộ nhớ của lượt chạy — vì vậy số lượng thất bại là một bảng cộng với một con số tạm thời trong RAM không sống sót qua lệnh restart.

Các thất bại giờ đây chia làm hai loại và không được đối xử giống nhau. Một đặc tả gọi tên một chiến lược không tồn tại là lỗi vĩnh viễn và tuyệt đối không được retry; một kết nối mạng bị rớt là lỗi tạm thời và bắt buộc phải retry. Hàng đợi BullMQ mặc định sẽ retry mọi thứ, vì vậy nếu không phân loại đúng thì một đặc tả sai sẽ bị retry liên tục cho đến khi cạn số lần thử, gây lãng phí tài nguyên vô ích.

Định danh ứng viên phụ thuộc vào tính nhất quán khi tuần tự hóa. Cùng một ứng viên nhưng nếu các trường trong JSON bị đảo thứ tự thì mã băm (hash) sẽ ra kết quả khác nhau, khiến search engine vô tình kiểm thử lại các tổ hợp mà nó đã từng thấy. Thứ tự trường, thứ tự thành viên và độ chính xác số thực đều phải được chuẩn hóa trước khi băm — một công việc nhỏ nhưng sẽ rất tai hại nếu bị bỏ qua đến ngày bảng xếp hạng bị tràn ngập các bản ghi trùng lặp.
