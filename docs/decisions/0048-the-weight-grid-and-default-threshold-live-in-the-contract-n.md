# Lưới trọng số và ngưỡng mặc định nằm trong contract, không nằm trong generator

## Why this (Lý do lựa chọn)

`CandidateMember.weight` được tài liệu hóa trong `packages/contracts/src/candidate.ts` là phải lớn hơn 0 một cách nghiêm ngặt, là bội số của 0.1, và có tổng bằng 1 trên toàn bộ một đặc tả, và `validateSpec` sẽ từ chối bất kỳ giá trị nào khác. Cho đến nay đoạn mã duy nhất có thể thỏa mãn quy tắc đó là hàm `balancedWeights()` bên trong `apps/api/src/search/candidate-space.ts`, vốn là hàm private của bộ sinh tìm kiếm, cùng với một hằng số private `DEFAULT_THRESHOLD = 0.3`.

Điều đó khiến quy tắc được mô tả trong một package nhưng lại được triển khai ở một package khác, và sự sai lệch đã bắt đầu diễn ra: màn hình Backtest tự xây dựng đặc tả một thành viên của riêng nó với `threshold: 0.5` (`apps/web/src/screens/BacktestScreen.tsx`), một con số khác với con số mà mọi ứng viên được sinh ra mang theo, mà không có lý do nào được ghi lại. Một nguồn sản xuất đặc tả thứ hai — bộ dựng công thức tổng hợp thủ công trên màn hình Search — sẽ tạo ra nguồn thứ ba lệch pha.

`balancedWeights`, `DEFAULT_THRESHOLD` và mức trần số lượng thành viên giờ đây nằm trong `packages/contracts/src/candidate.ts`, ngay cạnh đoạn chú thích nêu rõ quy tắc. Cả generator của API và trình duyệt đều import cùng một hàm, do đó một đặc tả được tạo thủ công và một đặc tả do công cụ tìm kiếm rút thăm đều được định hình bởi cùng một đoạn mã đồng nhất.

## What else we looked at (Các phương án khác đã cân nhắc)

**Để hàm helper lại trong API và sao chép nó sang trình duyệt** — sáu dòng mã, không phải chạm vào package nào, không cần viết bản ghi quyết định nào. Bị từ chối vì trình duyệt khi đó sẽ nắm giữ một quy tắc về thế nào là một ứng viên hợp lệ, điều mà `apps/web/docs/UI_CONSTRAINT.md` nghiêm cấm hoàn toàn, và vì việc có hai bản sao của một quy tắc lưới chính xác là cách mà sự phân tách ngưỡng 0.3/0.5 đã xảy ra ngay từ đầu.

**Một endpoint xây dựng đặc tả cân bằng ở phía máy chủ** — trình duyệt sẽ gửi các chiến lược đã chọn lên và nhận lại một đặc tả. Cách này giữ mọi quy tắc trên máy chủ, nhưng nó thêm một vòng chu chuyển mạng (round trip) và một endpoint cho một màn hình vốn đã nắm giữ danh sách chiến lược, và các trọng số dù sao cũng phải hiển thị trên giao diện người dùng trước khi người dùng đồng ý xác nhận chúng.

**Export module của generator từ package API** — ứng dụng web không phụ thuộc vào package API và không nên bắt đầu làm điều đó; package contracts là thứ duy nhất mà cả hai phía đều đã import sẵn.

## Trade-offs (Đánh đổi)

Package contracts giờ đây là ngôi nhà của một mẩu hành vi logic nhỏ thay vì chỉ chứa kiểu dữ liệu thuần túy. Đó là một sự mở rộng thực sự về bản chất của package, và nó chỉ được biện minh cho các quy tắc mà một đặc tả bắt buộc phải thỏa mãn mới được chấp nhận — lưới chia, tổng trọng số, và mức trần mười thành viên mà `balancedWeights` sẽ ném lỗi nếu vượt quá. Bất cứ thứ gì chỉ đơn thuần hỗ trợ xây dựng một đặc tả sẽ ở lại cùng với phía gọi nó.

`threshold: 0.5` của màn hình Backtest được giữ nguyên như hiện tại bởi thay đổi này. Đó là một đặc tả một thành viên đơn lẻ, nơi ngưỡng quyết định mức độ mạnh mẽ của một tín hiệu duy nhất thay vì mức độ đồng thuận mà một ủy ban nhiều chiến lược cần, do đó hai con số này không hẳn là cùng một câu hỏi. Việc định danh sự khác biệt đó, hoặc loại bỏ nó, thuộc về người tiếp theo chạm vào luồng xử lý đó.
