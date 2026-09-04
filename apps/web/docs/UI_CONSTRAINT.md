# Ràng buộc Thiết kế Giao diện — apps/web

Quy chuẩn bắt buộc áp dụng cho mọi tệp tin trong thư mục `src/`. Đọc kỹ tài liệu này trước khi bắt tay viết bất kỳ màn hình hoặc component nào.

Công việc thiết kế nên sử dụng công cụ hỗ trợ thiết kế frontend có sẵn trong agent harness cục bộ của thành viên. Trong môi trường Claude cục bộ của tác giả, công cụ đó là `impeccable`; các agent khác có thể đặt tên hoặc triển khai khác. Tệp tài liệu này lưu giữ các quy tắc cốt lõi bất biến dù giao diện có thay đổi thế nào — những quy tắc mà người review có thể kiểm tra một cách khách quan không phụ thuộc vào cảm tính cá nhân.

Ba tệp tài liệu, ba nhiệm vụ chuyên biệt: tệp này (`UI_CONSTRAINT.md`) là quy chuẩn bắt buộc mà reviewer kiểm tra; [`DESIGN.md`](DESIGN.md) là hệ thống thiết kế trực quan (visual system) sinh ra từ quy chuẩn đó — bảng màu, tỷ lệ font chữ, các trạng thái component, các quy tắc đặt tên; và chiến lược đằng sau cả hai tài liệu trên nằm trong [`PRODUCT.md`](PRODUCT.md). Một quy tắc chỉ được phép xuất hiện tại đúng một trong ba tài liệu này.

## Hai quy tắc có mức ưu tiên cao nhất

**Tái sử dụng (Reuse).** Tuyệt đối không tự viết lại bằng tay những gì repo đã có sẵn. Trước khi thêm mới một component, hãy kiểm tra kỹ thư mục `src/components/`. Một component bảng thứ hai, một modal thứ hai, một stat tile thứ hai được tạo mới còn tệ hơn là dùng lại một component sẵn có dù chưa hoàn hảo, bởi vì từ đó về sau mọi thay đổi trong tương lai sẽ bị phân tán thành hai nơi.

**Không đưa logic nghiệp vụ vào đây (No business logic here).** Frontend chỉ render hiển thị những gì mà backend đã tính toán xong. Không thực hiện các phép toán chiến lược, không mô phỏng backtest, không tính toán lợi nhuận, không xếp hạng điểm số, không tự suy luận tín hiệu mua bán. Đây là một trong năm anti-pattern bị trừ điểm nặng nhất trong đề bài, và là cái bẫy dễ trượt chân vào nhất — khoảnh khắc một con số được tính toán bên trong component thay vì đọc từ phản hồi API, ranh giới kiến trúc đã bị phá vỡ hoàn toàn.

## Các quy tắc không thể thương lượng (Non-negotiable)

- **Chỉ sử dụng Design Tokens, tuyệt đối không dùng mã màu thô.** Không viết trực tiếp mã hex, `rgb()` hay `hsl()` ra bên ngoài file token. Nếu cần một màu mới mà chưa có token phù hợp, hãy bổ sung token vào bảng định nghĩa. Quy tắc này được kiểm tra tự động bởi lệnh `pnpm lint:ui`.
- **Mọi màn hình đều phải xử lý đầy đủ bốn trạng thái**: đang tải (`loading`), trống rỗng (`empty`), lỗi (`error`), và đã có dữ liệu (`has-data`). Một màn hình chỉ render kịch bản thành công lý tưởng (happy path) là màn hình chưa hoàn thành. Trạng thái empty phải hướng dẫn người dùng bước tiếp theo nên làm gì; trạng thái error phải nêu rõ sự cố gì đã xảy ra và cách thử lại.
- **Độ tương phản văn bản nội dung (body text) phải đạt tối thiểu 4.5:1** so với màu nền, văn bản lớn đạt tối thiểu 3:1. Placeholder text cũng được tính là body text theo tiêu chuẩn này. Dùng màu xám nhạt "cho sang trọng" là nguyên nhân phổ biến nhất khiến giao diện trở nên mờ mịt và không đọc nổi.

  Một ngoại lệ duy nhất được đo lường và ghi nhận rõ ràng: mã màu `--bad` (`#f6465d`) đạt tỷ lệ tương phản **4.48:1** trên nền `--surface` và **3.72:1** trên một dòng dữ liệu đang hover. Màu này được giữ nguyên theo mã màu chuẩn của sàn giao dịch tiền mã hóa vì phương án thay thế là một màu đỏ lệch chuẩn thị trường — quyết định này được ghi nhận chính thức trong ADR 0051 và do chủ sản phẩm phê duyệt, không phải do component tự ý chọn. Ngoại lệ này chỉ được chấp nhận vì quy tắc "Không bao giờ để màu sắc đứng đơn độc (Never-Alone rule)" bên dưới nghiêm cấm việc chỉ dùng màu sắc thuần túy để truyền tải ý nghĩa: một người dùng không phân biệt được sắc đỏ vẫn đọc được dấu âm/dương, chữ hiển thị hoặc huy hiệu (badge) bên cạnh. Ngoại lệ này không áp dụng cho bất kỳ trường hợp nào khác: mọi màu chữ *mới* bắt buộc phải đạt chuẩn 4.5:1, và nếu sắc đỏ này trở thành phương tiện duy nhất để biểu đạt ý nghĩa thì nó sẽ bị coi là một bug.
- **Dùng thống nhất một bộ icon duy nhất, một độ dày nét (stroke width) duy nhất** trên toàn bộ ứng dụng. Việc pha trộn hai bộ icon khác nhau sẽ tạo cảm giác sản phẩm chắp vá, thiếu hoàn thiện.
- **Chiều cao điều khiển đồng nhất trên mỗi hàng (One control height per row).** Các ô input, select và button đặt cạnh nhau trên cùng một thanh công cụ bắt buộc phải dùng chung một token chiều cao. Các nút lệch kích thước trên cùng một hàng là dấu hiệu rõ ràng của một giao diện lắp ghép cẩu thả.
- **Giới hạn độ dài dòng văn bản từ 65–75 ký tự** đối với các đoạn văn xuôi dài.
- **Không lồng viền trong viền (No frame inside a frame).** Một ô input nằm bên trong một panel đã có viền bao quanh thì không cần thêm đường viền quá dày.
- **Quy mô thang bậc z-index đồng nhất**, được định nghĩa tập trung một lần. Tuyệt đối không dùng `z-index: 9999` tùy tiện.

## Biểu đồ (Charts)

Thư viện biểu đồ là thư viện đã được chốt trong task T06 và là thư viện duy nhất được phép sử dụng. Không thêm một thư viện chart thứ hai cho một màn hình khác.

- Màu sắc biểu đồ phải lấy từ design tokens như mọi thành phần khác. Các điểm đánh dấu mua (buy) và bán (sell) phải sử dụng semantic tokens đại diện cho success và danger, không dùng màu xanh đỏ tùy ý.
- Mọi biểu đồ phải đọc hiểu được mà không hoàn toàn phụ thuộc vào màu sắc — hình dạng điểm đánh dấu, vị trí hoặc nhãn chữ đi kèm phải cùng thể hiện ý nghĩa. Các cặp khái niệm Long và Short, Buy và Sell, Lời và Lỗ phải phân biệt được ngay cả khi hiển thị dưới thang xám (greyscale).
- Một biểu đồ khi chưa có dữ liệu phải hiển thị trạng thái empty state rõ ràng, không render một lưới ô vuông trống trơn vô hồn.

## Các bước kiểm tra trước khi xác nhận hoàn thành

```bash
pnpm --dir apps/web lint
pnpm --dir apps/web lint:ui
pnpm --dir apps/web build
```

Sau đó hãy mở trình duyệt lên. Một màn hình chưa từng được quan sát thực tế trên trình duyệt thì chưa thể coi là đã xong, và cả bốn trạng thái phải được kiểm tra bằng cách kích hoạt chúng trong thực tế — ngắt kết nối API để xem trạng thái error xử lý thế nào.

## Ghi chú về thiết kế ban đầu

Bộ design token, bộ thư viện component dùng chung và thư viện biểu đồ được khởi tạo từ task **T04** và **T06**. Tệp này định nghĩa các nguyên tắc cốt lõi bất biến; các công cụ hỗ trợ thiết kế sẽ sinh ra hệ thống trực quan đáp ứng các yêu cầu đó.
