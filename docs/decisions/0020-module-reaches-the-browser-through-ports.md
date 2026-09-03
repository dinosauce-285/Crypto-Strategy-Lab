# Module kết nối tới trình duyệt qua các cổng port của kênh, không qua bus

## Why this (Lý do lựa chọn)

ADR `0017` đã chốt cấu trúc của một tin nhắn và ADR `0003` đã chốt cách các module thông báo cho nhau, nhưng ở giữa chúng tồn tại một câu hỏi chưa ai trả lời: khi module dữ liệu thị trường (market) có một tick giá mới, làm thế nào nó thực sự đến được với socket? Ba module phát triển sau đó — T18 (Leaderboard), T20 (Search), T21 (Loop) — cũng sẽ gặp đúng câu hỏi này, và cách làm của module đầu tiên sẽ là thứ mà ba module sau sao chép lại.

Module kênh push export duy nhất hai lớp trừu tượng (ports): `ChannelPublisher` nhận vào một phong bì tin nhắn (envelope) và một chủ đề (topic); `TopicAudience` thông báo khi một topic vừa có người đăng ký đầu tiên hoặc vừa mất đi người đăng ký cuối cùng (bao gồm cả trường hợp ngắt kết nối mạng). Một module muốn đẩy dữ liệu ra ngoài sẽ inject các port này. Chiều phụ thuộc đi một chiều duy nhất — `market` import `realtime`, và `realtime` không import bất kỳ ai — đúng theo cấu trúc mà `BACKEND_CONSTRAINT.md` yêu cầu khi giao tiếp liên module: dùng abstract class hoặc token, không inject trực tiếp service cụ thể.

Phương án thay thế hiển nhiên là để kênh push tự lắng nghe event bus nội bộ rồi chuyển dịch (translate). Cách đó thoạt nhìn ít file hơn nhưng sai lầm ở chỗ: kênh push khi đó sẽ buộc phải biết sự tồn tại của sự kiện `market.candle.closed`, biết thế nào là một `Candle`, và biết cách đặt tên topic của market. Mỗi loại luồng dữ liệu mới sau này sẽ lại nhồi thêm một nhánh rẽ `switch-case` vào bên trong hạ tầng dùng chung — id của leaderboard, id của lượt search, trạng thái vòng lặp — và số lượng vị trí phải sửa đổi khi hệ thống phình to chính là thứ mà mục 42 đo lường. Giữ từ vựng nghiệp vụ nằm trọn trong module sở hữu nó giúp task T18 chỉ cần thêm một tên topic mà không phải sửa một dòng code nào bên trong module kênh push.

Port `TopicAudience` là nửa phần việc rất dễ bị bỏ quên: Nếu thiếu nó, module market hoàn toàn không biết có ai đang xem biểu đồ hay không, dẫn đến việc hoặc là nó phải stream dữ liệu của tất cả mọi cặp coin mãi mãi, hoặc ai đó phải dạy cho kênh push biết cặp coin là gì. Với port này, các kết nối upstream đến sàn Binance sẽ tự động bật/tắt theo nhu cầu thực tế của người dùng và kênh push vẫn hoàn toàn không cần biết nó đang đếm cái gì — nó chỉ báo cáo một chuỗi string.

Cơ chế này không thay thế event bus. Module `market` vẫn phát các sự kiện `MarketPriceUpdated` và `CandleClosed` lên bus nội bộ, vì kho lưu nến của T06 và cơ chế bù dữ liệu của T09 là các module backend chứ không phải màn hình trình duyệt. Quy tắc phân định nằm ở đối tượng tiếp nhận: module nói chuyện với module thì dùng event bus, module nói chuyện với trình duyệt thì dùng các cổng port của kênh push.

## What else we looked at (Các phương án khác đã cân nhắc)

**Kênh push tự subscribe vào bus nội bộ rồi dịch lại dữ liệu** — ít code nhất lúc ban đầu. Nhưng nó nhồi từ vựng nghiệp vụ vào bên trong hạ tầng dùng chung. Nó cũng vô tình biến payload của sự kiện bus nội bộ thành hợp đồng công khai với trình duyệt, vi phạm ranh giới mà ADR `0017` đã phân định rõ: tin nhắn socket được thiết kế cho màn hình, sự kiện bus được thiết kế cho module.

**Thêm các sự kiện bus mới cho vòng đời subscription** — kênh push phát ra sự kiện dạng `channel.topic.subscribed` và các module nghiệp vụ tự lắng nghe. Thoạt nhìn có vẻ đẹp trên sơ đồ vì hai bên hoàn toàn không biết nhau. Nhưng nó làm phình hợp đồng 9 sự kiện của toàn hệ thống bằng các sự kiện vòng đời UI thay vì sự kiện nghiệp vụ, và mọi module đều nhận được mọi sự kiện topic rồi phải tự lọc.

**Mỗi module nghiệp vụ tự sở hữu một WebSocket Gateway riêng** — không cần port, không cần cross-module injection. Nhưng nó dẫn đến 4 kết nối socket riêng biệt, 4 logic kết nối lại độc lập và 4 thứ phải giải thích trong tài liệu kiến trúc — chính là thứ mà ADR `0017` sinh ra để ngăn chặn.

## Trade-offs (Đánh đổi)

Một module nghiệp vụ (`market`) giờ đây import hạ tầng (`realtime`). Mũi tên phụ thuộc chỉ đúng chừng nào kênh push hoàn toàn sạch bóng các kiểu dữ liệu nghiệp vụ (domain types). Khoảnh khắc ai đó nhét `Candle` vào chữ ký hàm của port chỉ để tiết kiệm một dòng code, chiều phụ thuộc sẽ bị đảo ngược và thiết kế kiến trúc sẽ sụp đổ.

Việc hỗ trợ hai port là bề mặt giao tiếp lớn hơn mức mà một mình task T07 cần. Các task T18, T20 và T21 chỉ cần đẩy tin chứ không cần biết ai đang nghe, vì vậy `TopicAudience` tồn tại chỉ phục vụ đúng một bên tiêu thụ (`market`).

Việc phát dữ liệu diễn ra phân tán bên trong từng module khiến hệ thống không có một điểm tập trung duy nhất để quan sát mọi thứ được gửi ra trình duyệt.
