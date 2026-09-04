# Trình duyệt nhận dữ liệu qua một kênh push duy nhất phân định theo topic

## Why this (Lý do lựa chọn)

Một màn hình không được liên tục hỏi server cùng một câu hỏi (không polling), vì vậy server sẽ chủ động đẩy dữ liệu (push) — mục 4 của đề bài nêu thẳng điều này, và mục 33 kết thúc bằng việc frontend nhận sự kiện và cập nhật bảng mà không cần reload trang. Đó là một kênh duy nhất đẩy dữ liệu ra trình duyệt, và câu hỏi là những gì sẽ được truyền trên kênh đó?

Vấn đề thoạt nhìn như chỉ xoay quanh giá cả, vì giá là thứ duy nhất truyền đi lúc ban đầu. Nhưng không phải vậy. Cùng một kênh này về sau sẽ mang theo sự kiện `LeaderboardUpdated` từ task T18, tiến độ tìm kiếm từ task T20 và trạng thái vòng lặp từ task T21, vốn thuộc về ba người khác nhau phát triển. Một cấu trúc dữ liệu đường truyền chỉ thiết kế riêng cho nến sẽ không vừa với bất kỳ dữ liệu nào khác, dẫn đến việc mỗi tính năng tự dựng một kênh WebSocket riêng và hệ thống kết thúc với 4 cơ chế khác nhau chỉ để làm cùng một việc — một biểu hiện lộn xộn mà mục 41 được viết ra để vạch trần.

Vì vậy cấu trúc dữ liệu được thống nhất ngay từ bây giờ, khi mới chỉ có một trong bốn tính năng xuất hiện, và nó chốt bốn nguyên tắc cốt lõi:

**Một phong bì đóng gói duy nhất (One envelope).** Mọi tin nhắn đều gồm một trường `type` và một trường `payload`, và `type` là một chuỗi có namespace rõ ràng. Không có gì khác nằm ngoài khung này. Người đọc bất kỳ tin nhắn nào cũng biết chính xác nơi cần nhìn trước khi cần biết đó là loại tin nhắn gì.

**Phân định địa chỉ bằng chuỗi chủ đề (Topic string).** Một client đăng ký theo dõi `market:BTCUSDT:5m`, `leaderboard:<datasetId>`, `search:<runId>` hoặc `loop`. Bốn loại này lọc dữ liệu theo bốn loại khóa hoàn toàn khác nhau — cặp coin kèm timeframe, dataset, runId, hoặc không cần khóa nào cả — và một chuỗi string là cấu trúc duy nhất chứa được cả bốn mà không bắt server phải học logic chi tiết của từng loại. Server chỉ so khớp chuỗi topic; nó không diễn giải nội dung topic. Thêm một loại dữ liệu thứ năm chỉ là quy ước đặt tên mới, không cần sửa đổi mã nguồn chuyển phát dữ liệu — điều mà mục 42 của đề bài kiểm tra.

Hủy đăng ký (unsubscribe) theo từng topic, nhờ đó yêu cầu của task T08 được đáp ứng tự nhiên: một biểu đồ đổi khung thời gian chỉ hủy một topic và ba biểu đồ còn lại không bị xáo trộn.

**Nội dung tin nhắn phụ thuộc vào bên nào tính toán con số:** Nếu server tính toán lại dữ liệu trên mỗi lần đọc, tin nhắn chỉ thông báo rằng dữ liệu vừa thay đổi và client sẽ tự truy vấn lại. Ngược lại, tin nhắn sẽ mang theo trực tiếp giá trị dữ liệu mới.

Hiện tại bảng xếp hạng là đối tượng duy nhất nằm ở phía thông báo (notification-only), vì lý do cụ thể: ADR `0011` quy định bảng xếp hạng được tính toán lại trên mỗi lần đọc, vì vậy một bảng xếp hạng đính kèm vào tin nhắn đã được tính tại thời điểm gửi và có thể đã bị cũ ngay khi tới nơi — và một bảng xếp hạng bị cũ trông vẫn y hệt như mới. Ngược lại, giá cả nằm ở phía mang dữ liệu trực tiếp vì khớp lệnh (tick) đến nhiều lần mỗi giây trên bốn biểu đồ, nếu biến mỗi tick thành một lượt gọi HTTP thì hệ thống sẽ quá tải vô nghĩa.

**Không gửi ảnh chụp ban đầu (snapshot) qua socket lúc kết nối.** Trạng thái ban đầu được lấy qua HTTP REST API; kênh push chỉ truyền những gì thay đổi sau đó. Task T06 đã có sẵn endpoint lấy nến để vẽ biểu đồ đầu tiên, vì vậy phương án ngược lại sẽ ép mỗi loại dữ liệu phải tự định nghĩa snapshot riêng qua socket, làm trùng lặp vô ích với endpoint HTTP sẵn có.

Hai ranh giới kỹ thuật quan trọng: Kênh này **không phải** là event bus của ADR `0003`. Bus sự kiện nội bộ phục vụ giao tiếp giữa các module backend, còn kênh này định hình cấu trúc dữ liệu đường truyền ra trình duyệt. Đấu thẳng bus sự kiện ra ngoài sẽ biến sự kiện nội bộ của module thành hợp đồng công khai với trình duyệt. Và ADR `0004` cũng đã phân định: việc gì không được mất mát phải đi qua hàng đợi BullMQ, việc gì chỉ cập nhật hiển thị giao diện thì đi qua kênh này, đó là lý do dữ liệu trên kênh này không cần cơ chế retry.

Hợp đồng này nằm trong `@csl/contracts` vì có tới ba module khác sẽ import nó.

## What else we looked at (Các phương án khác đã cân nhắc)

**Đăng ký có kiểu dữ liệu chặt chẽ — `{ channel, filter }`** — phiên bản mà trình biên dịch có thể kiểm tra type. Mỗi loại luồng dữ liệu cần một cấu trúc filter riêng, khiến server phải thêm một nhánh rẽ tương ứng và việc thêm loại thứ năm sẽ đòi hỏi phải sửa server. Độ an toàn kiểu mà nó mang lại chỉ kiểm tra cấu trúc filter, không kiểm tra được việc topic đó có dữ liệu hay không.

**Dùng trực tiếp Rooms hoặc Namespaces của thư viện Socket** — không phải tự thiết kế. Nhưng nó đặt cơ chế định địa chỉ vào bên trong một thư viện phụ thuộc thay vì trong package contracts của dự án, biến một quyết định kiến trúc thành việc phụ thuộc vào thư viện bên ngoài, và việc đổi thư viện sau này sẽ làm gãy hợp đồng của mọi client.

**Mọi tin nhắn đều mang theo toàn bộ dữ liệu** — client không phải hỏi lại, code đồng nhất. Nhưng nó phá vỡ ADR `0011` ở điểm trọng yếu nhất: bảng xếp hạng tính toán lúc đọc, nên dữ liệu mang đi đã bị cũ và không có gì cảnh báo bảng xếp hạng bị sai.

**Mọi tin nhắn chỉ là thông báo trơ trọi, client tự fetch lại toàn bộ** — một quy tắc duy nhất, payload nhẹ nhất. Nhưng một tick giá biến thành một lượt gọi HTTP nhân với 4 biểu đồ, hàng chục lượt mỗi giây.

## Trade-offs (Đánh đổi)

Topic là một chuỗi string, vì vậy lỗi gõ sai chính tả không bị trình biên dịch phát hiện. Đăng ký nhầm `market:BTCUSDT:5min` sẽ không nhận được dữ liệu nào, và việc không nhận được gì trông y hệt như một thị trường đang đứng yên. Một hàm builder trong package contracts giúp hạn chế lỗi này ở phía client.

Dữ liệu trên kênh này không được đảm bảo phân phát tin cậy 100% (không có retry). Một màn hình bỏ lỡ thông báo `leaderboard.changed` sẽ hiển thị dữ liệu cũ cho đến khi có sự kiện tiếp theo. Đây là sự đánh đổi đúng đắn cho một kênh hiển thị giao diện bề mặt.
