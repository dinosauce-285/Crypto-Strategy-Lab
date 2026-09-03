# Khớp lệnh realtime mang theo khối lượng volume và bên mua/bán

## Why this (Lý do lựa chọn)

Bảng khớp lệnh tức thời (ticks panel) trên màn hình realtime nhằm mục đích thể hiện đúng ví dụ thực tế trong mục 2 của đề bài — các giao dịch diễn ra ngay khoảnh khắc thực tế. Tuy nhiên, một con số giá đơn độc lặp lại mỗi giây chỉ giống như một chuỗi số nhiễu chứ không phải một bảng khớp lệnh (trade tape). Một bảng khớp lệnh chỉ thực sự hữu ích khi có thông tin về khối lượng (đây là một lệnh lớn hay lệnh nhỏ) và chiều hướng giao dịch (thị trường đang bị bên mua hay bên bán áp đảo). Đó chính xác là những gì luồng dữ liệu khớp lệnh của Binance (`trade stream`) đã mang theo trên từng gói tin: trường `q` (quantity - khối lượng) và trường `m` (isBuyerMaker - bên mua có phải là lệnh chờ resting order hay không). Trước đây adapter `binance-stream.adapter.ts` đã parse gói tin này nhưng lại bỏ qua hai trường đó.

ADR `0017` đã quy định rằng tin nhắn socket được thiết kế phục vụ màn hình hiển thị chứ không phụ thuộc vào những gì sàn tình cờ gửi về — vì vậy đây không phải là việc "chuyển tiếp nguyên xi các trường của Binance", mà là "hợp đồng của màn hình được bổ sung thêm hai trường cần thiết", được adapter trích xuất và chuyển đổi từ gói tin của Binance tương tự như giá và nến. Trường `side` (bên mua/bán) là giá trị được suy luận chứ không sao chép nguyên bản: cờ `m` của Binance là `isBuyerMaker`, và giá trị `true` ở đây có nghĩa là lệnh chờ sẵn trong sổ lệnh là lệnh mua, do đó lệnh khớp chủ động (taker) là lệnh bán — adapter thực hiện việc chuyển đổi này một lần duy nhất, đảm bảo các thành phần phía sau không cần bận tâm cờ `m` nghĩa là gì.

## What else we looked at (Các phương án khác đã cân nhắc)

**Tách thành một loại tin nhắn `Trade` riêng biệt bên cạnh `MarketPrice`** — giữ cho `MarketPrice` nhẹ nhàng cho những bên tiêu thụ chỉ cần giá. Nhưng cái giá phải trả là hai lượt subscribe và hai bộ xử lý handler ở mọi nơi màn hình cần cả hai thông tin. Hiện tại mọi bên tiêu thụ `market:PAIR:price` (ô hiển thị giá, và bảng khớp lệnh) đều cần thông tin từ cùng một giao dịch, chỉ khác ở cách hiển thị. Một tin nhắn duy nhất mà bảng khớp lệnh đọc 3 trường còn ô giá đọc 1 trường là giải pháp đồng nhất và hiệu quả hơn.

**Tính toán volume và side trong `MarketService` thay vì trong adapter** — `MarketService` được thiết kế hoàn toàn không phụ thuộc vào sàn cụ thể (`ExchangeStreamPort` tồn tại để nó không bao giờ phải parse gói tin của Binance). Đưa logic dịch `isBuyerMaker` vào đó sẽ bắt một module độc lập với sàn phải học hiểu cờ của riêng một sàn giao dịch, điều mà kiến trúc phân cổng của ADR `0020` đã ngăn chặn.

## Trade-offs (Đánh đổi)

Payload `MessagePayloads[MarketPrice]` giờ đây lớn hơn một chút cho mọi bên tiêu thụ, kể cả những nơi chỉ cần mức giá đơn thuần. Dù vậy đây là mức tăng dung lượng rất nhỏ trên đường truyền mạng.

Trường `side` là một giá trị suy luận logic (bên chủ động khớp lệnh) chứ không phải một trường chữ có sẵn do Binance gán nhãn — đối với stream giao dịch tổng hợp của Binance thì đây là cách đọc chuẩn mực đã được tài liệu hóa, nhưng nó vẫn là giá trị phái sinh được đưa vào hợp đồng đường truyền.
