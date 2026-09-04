# Các chiến lược được đăng ký một cách tường minh qua danh sách

## Why this (Lý do lựa chọn)

Mục 12 của đề bài yêu cầu phải có một Registry quản lý chiến lược, và mục 41 chấm điểm thiết kế này bằng cách yêu cầu thêm một chiến lược mới trực tiếp trong buổi bảo vệ. Chúng ta chọn giải pháp đăng ký tường minh qua danh sách: mỗi chiến lược export metadata và factory của nó, và thêm đúng một dòng vào registry là hoàn thành việc đăng ký.

Cách làm này giữ cho chi phí phát triển luôn tường minh. Bổ sung chiến lược MACD chỉ là thêm một file chiến lược mới cộng với một dòng khai báo trong `registered-strategies.ts`; xưởng khởi tạo (factory), bộ chạy backtest, form giao diện, không gian tìm kiếm và biểu đồ hoàn toàn không cần học thêm tên chiến lược mới. Nó cũng khớp hoàn hảo với triết lý của NestJS hơn là cơ chế tự động quét thư mục (filesystem discovery): registry là một provider, bảng `Strategy` trong database được đồng bộ tự động từ metadata lúc server khởi động, và tiến trình worker nhận cùng một provider đó khi tái tạo các ứng viên từ hàng đợi.

Đăng ký tường minh cũng là phương án dễ bảo vệ nhất trong buổi demo trực tiếp. Dòng code chứng minh chiến lược đã sẵn sàng hoạt động là mã nguồn thuần túy, được TypeScript kiểm tra kiểu và được review như bất kỳ dependency nào khác.

## What else we looked at (Các phương án khác đã cân nhắc)

**Tự động quét thư mục (Directory scanning)** — thoạt nhìn rất hấp dẫn vì chỉ cần thả một file vào thư mục là xong. Nhưng nó phải trả giá bằng các quy tắc nạp module lúc runtime: mã nguồn TypeScript sau khi build không còn cùng cấu trúc với file gốc, các test runner và môi trường production giải quyết đường dẫn module khác nhau, và việc trùng lặp id chiến lược chỉ được phát hiện sau khi đã quét toàn bộ ổ đĩa. Nó cũng giấu nhẹm điểm mở rộng khỏi tầm mắt của ban giám khảo mục 41.

**Khởi tạo bằng logic rẽ nhánh viết cứng trong Factory** — `if id === "ma"` rồi thêm nhánh khác cho RSI. Đây chính là anti-pattern viết cứng chiến lược mà mục 44 nêu tên, và mỗi chiến lược mới sẽ phải mở sửa class Factory vốn nên được đóng kín đối với việc sửa đổi (Open/Closed Principle).

**Định nghĩa chiến lược từ cơ sở dữ liệu** — chỉ hữu ích nếu các chiến lược là các đoạn script động hoặc remote plugin. Nhưng ở đây hành vi là mã nguồn TypeScript đã được deploy cùng với worker. Một dòng dữ liệu trong DB chỉ có thể mô tả chiến lược chứ không thể tự khởi tạo class nếu thiếu registry, do đó nó chỉ tạo thêm nguồn sự thật thứ hai thay vì thay thế nguồn cũ.

## Trade-offs (Đánh đổi)

Thêm một chiến lược mới vẫn cần sửa một dòng code bên ngoài file của chính nó. Quên thêm dòng đăng ký này sẽ khiến file dù compile thành công nhưng chiến lược vẫn không hiển thị trên hệ thống.

Registry này không phải là một plugin loader động tải các gói package ngoài.

Vì danh sách là tường minh, xung đột git (merge conflict) có thể xảy ra khi hai người cùng thêm hai chiến lược khác nhau vào cùng một file danh sách. Xung đột này rất nhỏ và dễ giải quyết, nhưng là cái giá của việc tập trung về một danh sách duy nhất.
