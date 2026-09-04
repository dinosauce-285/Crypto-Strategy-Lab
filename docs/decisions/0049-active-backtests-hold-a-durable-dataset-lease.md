# Các lượt backtest đang hoạt động nắm giữ một lease Dataset bền vững

## Why this (Lý do lựa chọn)

Một Dataset chỉ có thể bị xóa khi không có Thực nghiệm (Experiment) nào tham chiếu đến nó, nhưng một Experiment trước đây chỉ tồn tại sau khi quá trình mô phỏng đã kết thúc. Do đó, một lượt backtest đơn lẻ hoặc một worker trong hàng đợi có thể đọc một Dataset, chạy mô phỏng trên đó, và mất Dataset đó trước khi kịp ghi nhận kết quả của mình. Lỗi này không thể cứu vãn được: worker không thể tái tạo lại các quy tắc hoặc gắn kết quả của nó vào một Dataset đã bị xóa.

Một tác vụ tính toán đang hoạt động giờ đây sẽ tạo ra một lease Dataset ngắn hạn trong Postgres trước khi bắt đầu, gia hạn nó mỗi phút một lần, nhường quyền điều khiển sau mỗi cây nến được xử lý để việc gia hạn có thể chạy, và xóa nó trong khối `finally`. Mỗi lần thử của worker sở hữu một id lease mới, vì vậy việc thử lại không bao giờ xung đột với bản ghi mà một lần thử bị crash để lại phía sau. Giao dịch ghi lại một Experiment sẽ gia hạn và xác minh lease của nó trước khi chèn, do đó một hàng đã hoàn thành không thể được ghi sau khi quyền bảo vệ đã bị mất. Thao tác xóa Dataset sẽ xóa các lease đã hết hạn trước tiên, sau đó dựa vào chính ràng buộc khóa ngoại bảo vệ Experiments. Lease này hiển thị cho cả tiến trình API và tiến trình worker riêng biệt, vì vậy một tab không thể xóa dữ liệu mà một tab khác đang tích cực sử dụng. Worker ghi nhận Experiment thất bại cuối cùng trước khi giải phóng lease, do đó việc hạch toán thất bại cũng nhận được sự bảo vệ xóa giống như một kết quả đã hoàn thành.

## What else we looked at (Các phương án khác đã cân nhắc)

**Vô hiệu hóa các nút điều khiển trong React** — phản hồi hữu ích, nhưng nó chỉ bảo vệ tab đã khởi động công việc. Một tab khác hoặc một lệnh gọi HTTP trực tiếp vẫn có thể xóa Dataset, vì vậy đây không thể là ranh giới toàn vẹn dữ liệu.

**Tạo một Experiment với trạng thái `running` trước khi mô phỏng** — làm cho công việc đang hoạt động trở nên hiển thị, nhưng biến Experiment thành một kết quả chỉ biết được một phần. Việc phục hồi sau sự cố, xử lý trùng lặp và lọc bảng xếp hạng đều sẽ phải học thêm trạng thái vòng đời thứ ba, điều này gây ra nhiều sự ràng buộc hơn mức mà một bản ghi sử dụng tạm thời cần có.

**Chỉ giữ lease trong bộ nhớ tiến trình** — nhỏ gọn và đủ dùng cho một lượt backtest đơn lẻ, nhưng worker là một tiến trình riêng biệt và việc khởi động lại sẽ làm mất sự bảo vệ chính xác vào lúc nó cần thiết nhất.

## Trade-offs (Đánh đổi)

Lược đồ cơ sở dữ liệu có thêm một bảng vận hành nhỏ và mỗi lượt backtest bổ sung thêm một lệnh insert, các lần gia hạn định kỳ và một lệnh delete. Một tiến trình bị crash có thể để lại một lease phía sau cho đến khi nó hết hạn, tạm thời từ chối một yêu cầu xóa an toàn. Các hàng đã hết hạn được dọn dẹp khi khởi động API và worker cũng như trước khi lấy quyền và xóa. Điều đó tốt hơn là cho phép xóa trong khi công việc vẫn có thể đang chạy; thời hạn hết hạn sẽ giới hạn sự bất tiện này thay vì làm cho một Dataset vĩnh viễn không thể xóa được.
