# Adapter lịch sử nằm sau ExchangeHistoryPort tương tự REST side

## Why this (Lý do lựa chọn)

Tệp `market.service.ts` vốn đã phụ thuộc vào interface `ExchangeStreamPort` cho luồng trực tiếp — toàn bộ lập luận của ADR `0020` là không thành phần nào bên ngoài adapter được phép biết sự tồn tại của sàn Binance. Nhưng task T06 trước đây đã xây dựng phần REST/backfill trong cùng một file, cùng một module, và lại inject trực tiếp lớp cụ thể `BinanceRestAdapter` vào `MarketService`. Lời ghi chú trên `ExchangeStreamPort` ("đứng sau cổng này, không ai biết dữ liệu đến từ sàn nào") chưa từng đúng đối với nửa phần việc dữ liệu lịch sử — và quyết định này làm cho điều đó trở nên chuẩn xác. Mục 1 của đề bài nêu rõ yêu cầu này cho các sàn giao dịch nói chung: việc hoán đổi sang `OKXAdapter` hay `BybitAdapter` chỉ là thêm một class mới và một dòng đăng ký module, tuyệt đối không được sửa đổi `MarketService`.

## What else we looked at (Các phương án khác đã cân nhắc)

**Giữ nguyên lớp cụ thể — vì hiện tại chỉ có một sàn duy nhất** — phương án tối giản dễ thấy, và là những gì T06 từng đưa ra. Bị loại bỏ vì sự thiếu nhất quán: luồng stream đưa ra quyết định ngược lại vì cùng một lý do trong cùng một file, và người đọc code sẽ không hiểu tại sao một lệnh gọi sàn thì đứng sau port còn lệnh gọi sàn kia thì không.

**Gộp `ExchangeHistoryPort` vào chung với `ExchangeStreamPort`** thành một interface lớn duy nhất. Ít type hơn, nhưng một kết nối stream dài hạn và một lệnh fetch REST có giới hạn mang hai hình thái hoàn toàn khác nhau (một bên giữ handle kết nối lâu dài, một bên chỉ trả về kết quả một lần). Ép chúng vào một interface sẽ khiến các phương thức trở thành tùy chọn (optional) trên các adapter không cần đến, vi phạm nguyên tắc thiết kế port đơn mục đích của ADR `0020`.

## Trade-offs (Đánh đổi)

Thêm một file interface và một injection token cho một bản cài đặt duy nhất ở thời điểm hiện tại. Đổi lại, `MarketService` hoàn toàn không còn lý do gì để phải chỉnh sửa khi có thêm một sàn giao dịch thứ hai được tích hợp vào hệ thống.
