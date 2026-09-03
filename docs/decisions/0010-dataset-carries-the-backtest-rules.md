# Dataset là một bản ghi có id riêng, mang theo toàn bộ quy tắc backtest

## Why this (Lý do lựa chọn)

Một bảng xếp hạng (leaderboard) chỉ có ý nghĩa khi các kết quả trên đó được tạo ra theo cùng một phương pháp đo lường. Có hai yếu tố quyết định điều đó: dữ liệu thị trường mà lượt chạy sử dụng, và các quy tắc mà nó bị phán quyết. Cả hai yếu tố này đều không thể để ngầm định.

Nửa dữ liệu thị trường là bộ ba thông tin mà mục 33 của đề bài quy định — cặp coin, khoảng thời gian ngày tháng, và khung thời gian (timeframe). Nếu lưu trữ ba thông tin này dưới dạng các trường rời rạc bên cạnh mỗi lượt chạy, bộ lọc bảng xếp hạng sẽ phải so sánh ba giá trị cùng lúc, và một ngày nào đó ai đó sẽ vô tình chỉ so sánh hai. Hệ thống không báo lỗi; bảng xếp hạng sẽ âm thầm trộn lẫn dữ liệu tháng 1 với tháng 7 mà thoạt nhìn vẫn bình thường. Một bản ghi `Dataset` với id riêng biến bộ lọc đó thành một phép so sánh id duy nhất, và một experiment trỏ đến id đó thì không thể trỏ chập chờn một nửa.

Nửa quy tắc phán quyết là phần mà đề bài không nêu tên rõ ràng nhưng lại là phần dễ gây hối tiếc nhất nếu làm sai: Lệnh được mở tại giá đóng cửa của cây nến phát tín hiệu hay mở tại giá mở cửa của cây nến tiếp theo? Có trừ phí giao dịch hay không? Bỏ qua bao nhiêu cây nến đầu tiên làm warm-up? Lợi nhuận tính theo lãi cộng dồn hay lãi kép? Mức sụt giảm tài khoản drawdown được đo tại giá đóng cửa hay quét từng nến? — Chỉ cần thay đổi một trong các quy tắc này, toàn bộ các con số tạo ra trước đó sẽ không còn so sánh được với các con số sinh ra sau đó nữa. Chúng gắn liền với bản chất "kết quả này được đánh giá như thế nào" không kém gì khoảng thời gian ngày tháng.

Vì vậy, toàn bộ các quy tắc đó nằm trọn vẹn bên trong Dataset. Hệ quả kéo theo cũng chính là lý do kiến trúc: việc thay đổi một quy tắc phán quyết sẽ sinh ra một **Dataset mới**, với một id mới và một bảng xếp hạng mới tinh, trong khi toàn bộ các kết quả cũ vẫn giữ nguyên tính hợp lệ bên trong thế giới dataset mà chúng được sinh ra. Nguy cơ của phương án ngược lại không phải là kết quả cũ bị sai — mà là chúng bị sai nhưng vẫn nằm chễm chệ trên cùng một bảng xếp hạng, không thể phân biệt được với kết quả mới, cho đến khi có người nhận ra sau nhiều tháng.

Chi phí tạo một dataset mới rất nhẹ nhàng vì dataset không trực tiếp chứa các cây nến. Nến nằm trong bảng riêng có khóa là (pair, timeframe, openTime); dataset chỉ định danh một cửa sổ nhìn vào tập nến đó. Thay đổi mức phí chỉ là ghi thêm một dòng dữ liệu, không phải tải lại dữ liệu từ sàn.

Nếu không làm điều này, bất kỳ ai phụ trách task T12 và T13 sẽ buộc phải đóng băng cứng các quy tắc trước khi lượt tìm kiếm đầu tiên chạy, và không bao giờ có cơ hội điều chỉnh lại chúng.

## What else we looked at (Các phương án khác đã cân nhắc)

**Lưu ba tham số rời rạc cho mỗi lượt chạy** — không cần bảng mới, không cần bước tra cứu id trước khi chạy. Nhưng nó thất bại ở vị trí duy nhất nó được dùng: bộ lọc. Ba trường phải so sánh mỗi lần là ba cơ hội để bỏ sót, và lỗi này xảy ra trong im lặng tuyệt đối.

**Dataset có id riêng, nhưng các quy tắc để bên ngoài dưới dạng cấu hình lúc chạy (runtime config)** — đây là cách hầu hết các nhóm hay làm theo thói quen, giúp bảng dataset gọn nhẹ. Nhưng đây chính là trường hợp mà quyết định này sinh ra để ngăn chặn: quy tắc nằm trong file config, config bị sửa, và không có dòng dữ liệu nào trong database ghi lại sự thay đổi đó. Bảng xếp hạng khi đó chứa hai tập kết quả khác nhau dưới cùng một vỏ bọc.

**Tạo thêm id `RuleSet` riêng đi kèm id `Dataset`** — chuẩn xác hơn về mặt lý thuyết, vì đổi mức phí không làm thay đổi tập nến đã dùng, và cho phép tái sử dụng cùng một bộ quy tắc trên nhiều khoảng thời gian. Phương án này bị loại bỏ vì bộ lọc leaderboard lại quay về việc so sánh hai trường thay vì một, và một dòng dữ liệu nhẹ trong database cho mỗi lần đổi quy tắc là chi phí quá rẻ, không đáng để đẻ thêm một khái niệm thực thể thứ hai.

## Trade-offs (Đánh đổi)

Các quy tắc phán quyết bắt buộc phải được thiết kế và chốt ngay từ bây giờ, trước khi T12 và T13 được viết, bởi những người lúc đó chưa trực tiếp bắt tay vào code phần đó. Một quy tắc chọn chưa chuẩn sẽ không thể sửa đè tại chỗ — nó đồng nghĩa với việc tạo dataset mới và chạy lại các thử nghiệm quan trọng.

Tên gọi giờ đây mang nghĩa rộng hơn một chút: một "dataset" vừa chứa thông tin dữ liệu là gì *vừa* chứa thông tin nó được đánh giá như thế nào — hai khái niệm nằm chung dưới một từ ngữ. Chúng ta chấp nhận sự chưa hoàn hảo về mặt ngôn từ để đổi lấy sự đơn giản của một khóa định danh duy nhất.

Các thay đổi quy tắc sẽ làm tăng số lượng dòng trong bảng dataset, và người dùng nhìn vào danh sách sẽ thấy nhiều dataset chỉ khác nhau mỗi mức phí giao dịch. Giao diện người dùng bắt buộc phải hiển thị rõ bảng xếp hạng đang thuộc về dataset cụ thể nào để tránh gây nhầm lẫn.

Và cam kết kiến trúc này chỉ chuẩn xác chừng nào danh sách quy tắc được liệt kê đầy đủ: bất kỳ quy tắc đánh giá nào *không* nằm trong dataset sẽ là quy tắc có thể bị âm thầm thay đổi. Việc bổ sung thêm một quy tắc mới sau này đồng nghĩa với việc toàn bộ các dataset cũ đều ra đời trước quy tắc đó và không có bản ghi nào lưu lại trạng thái trước đây của nó.
