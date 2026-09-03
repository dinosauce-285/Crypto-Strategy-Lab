# Một lượt chạy báo cáo ứng viên đang được thử nghiệm ngay lúc này

## Why this (Lý do lựa chọn)

Section 46 bước 4 mô tả màn hình hiển thị những gì trong khi tìm kiếm đang chạy, và nó gồm ba dòng: bao nhiêu ứng viên đã được thử nghiệm, ứng viên nào đang được thử nghiệm lúc này, và một lượt backtest đang diễn ra. Panel trước đây chỉ có dòng đầu tiên và không có gì khác. `RunStatus` mang các bộ đếm và kết quả tốt nhất tính đến hiện tại, và không có trường nào gọi tên ứng viên mà worker đang xử lý, do đó màn hình không thể hiển thị nó dù được viết như thế nào.

Dòng còn thiếu chính là dòng làm cho hai dòng kia có ý nghĩa. `Đã thử 125` với một danh sách chiến lược đứng im bên cạnh đọc lên như nhau bất kể vòng lặp đang hoạt động hay đã bị treo — đó là một con số từng đúng ở một thời điểm nào đó. Việc gọi tên ứng viên đang xử lý chính là điều biến bảng trạng thái thành bằng chứng cho thấy cỗ máy đang sống, và đó là sự khác biệt mà Section 32.7 đang muốn biết khi hỏi liệu vòng lặp có đang chạy hay không.

Vì vậy `RunStatus` nhận thêm trường `current`, lưu giữ đặc tả và mã băm của nó. Nó nằm trên `RunStatus` bên cạnh `state` thay vì nằm bên trong `counters`, vì `counters` trả lời năm câu hỏi của Section 32.7 và đây không phải là một trong số đó: nó không phải là một số đếm, nó là những gì lượt chạy đang làm ngay tại thời điểm này, và đó là mục đích của `state`.

Nó mang toàn bộ `CandidateSpec` thay vì một chuỗi văn bản đã được render sẵn. Panel cần các id thành viên và các tham số của chúng để viết `MA20 + RSI14 + SR`, đặc tả đã nằm sẵn trong bộ nhớ dưới dạng mục chờ mà job được đưa vào hàng đợi cùng với nó, và một nhãn được ghép trên máy chủ sẽ là nơi thứ hai quyết định cách một ứng viên được đặt tên — bảng xếp hạng vốn đã là nơi thứ nhất.

Nhiều worker có thể đang thử nghiệm cùng một lúc, vì vậy `current` là ứng viên được bắt đầu gần đây nhất trong số chúng thay vì là ứng viên duy nhất. Đó là một sự đơn giản hóa và điều này được nêu rõ trong hợp đồng, vì phương án ngược lại sẽ giống như một sự dối trá đối với bất kỳ ai đang chạy ba worker.

## What else we looked at (Các phương án khác đã cân nhắc)

**Suy diễn nó trong trình duyệt từ các sự kiện đã phát ra** — `BacktestStarted` mang một `specHash` và truyền qua kênh kết nối hiện nay, do đó panel có thể lưu giữ mã băm cuối cùng mà nó nhìn thấy. Nhưng nó thất bại ngay khi vừa tới: một màn hình được mở giữa chừng lượt chạy không nhìn thấy sự kiện nào trước đó và sẽ không hiển thị gì cho đến khi ứng viên tiếp theo bắt đầu, và việc kết nối lại cũng thiết lập lại trạng thái này. Status là thứ bạn có thể truy vấn; một luồng sự kiện là thứ bạn có thể bỏ lỡ phần đầu, và Section 46 bước 4 mô tả những gì màn hình hiển thị, chứ không phải những gì nó đã tích lũy.

**Chỉ gửi mỗi `specHash`** — nhỏ gọn hơn, và trình duyệt đã rút ngắn mã băm ở những nơi khác. Nhưng `hash: a3f9c1b2` không phải là thứ Section 46 yêu cầu, và một mã băm chỉ gọi tên một ứng viên đối với người đang nắm giữ bảng dữ liệu sinh ra nó. Mục đích của dòng này là để một người đọc nhận ra sự kết hợp của các chiến lược.

**Gửi một nhãn hoàn chỉnh như `"MA20 + RSI14 + SR"`** — chính xác là những gì màn hình cần, không phải ghép chuỗi trong trình duyệt. Nhưng nó đặt việc đặt tên lên máy chủ, trong khi việc đặt tên của bảng xếp hạng lại không nằm ở đó, khiến cho cùng một ứng viên lại được mô tả bởi hai đoạn mã có nguy cơ bị lệch pha. Nó cũng đóng băng định dạng: một giao diện người dùng sau này muốn hiển thị các tham số trong tooltip sẽ phải thay đổi một hợp đồng để lấy được chúng.

**Bổ sung trường `substate` cho trạng thái "backtesting"** — dòng thứ ba của Section 46 bước 4, được viết tường minh. Nhưng nó đã được ngầm định sẵn: `state === 'running'` với sự hiện diện của `current` chính là ý nghĩa của việc đang backtest, và một trường có thể suy diễn từ hai trường khác là một trường có thể mâu thuẫn với chúng.

## Trade-offs (Đánh đổi)

`RunStatus` được xuất bản trên mọi sự kiện hàng đợi, và `current` làm cho mỗi tin nhắn đó mang một đặc tả đầy đủ thay vì chỉ một vài con số. Đối với một lượt chạy ở độ sâu hàng đợi thông thường, điều này tiêu tốn thêm vài trăm byte vài lần mỗi giây — hoàn toàn không đáng kể ở đây, và là điều đầu tiên cần xem xét lại nếu panel này được trỏ vào một lượt chạy với rất nhiều worker.

`current` là ứng viên cuối cùng được bắt đầu, và với nhiều worker, màn hình sẽ hiển thị tên của một trong số nhiều ứng viên trong khi tạo cảm giác nó là ứng viên duy nhất. Một người dùng theo dõi một lượt chạy có ba worker sẽ thấy một cái tên thay đổi nhanh hơn tốc độ ứng viên hoàn thành và không tương ứng với cái kết thúc tiếp theo. Hợp đồng có nêu rõ điều này, nhưng một ghi chú hợp đồng thì không xuất hiện trên màn hình.

Trường này là tùy chọn (optional) và vắng mặt giữa các ứng viên, do đó dòng thông tin mà nó cấp dữ liệu có thể xuất hiện rồi biến mất khi các tác vụ luân chuyển. Một panel render nó một cách ngây thơ sẽ bị nhấp nháy, và cách khắc phục thuộc về tầng trình bày — giữ lại giá trị cuối cùng trong khi lượt chạy vẫn đang chạy — điều này có nghĩa là trình duyệt hiện giữ một mẩu trạng thái nhỏ mà máy chủ cũng có.
