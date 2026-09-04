# Các tính năng được lập kế hoạch qua OpenSpec, và lập luận vẫn lưu tại docs/decisions/

## Why this (Lý do lựa chọn)

Một thẻ task trên Trello cho biết định nghĩa "hoàn thành" là gì. Một bản ghi ADR giải thích tại sao một lựa chọn kỹ thuật lại đi theo hướng đó. Giữa hai tài liệu đó tồn tại một khoảng trống chưa ai lấp đầy: chính xác những gì đang được xây dựng, theo thứ tự nào, và hệ thống có khả năng làm được những gì sau khi hoàn thành.

Trước đây khoảng trống đó chỉ nằm trong đầu của người trực tiếp làm task, hoặc trong `.claude/plans/` vốn bị gitignore và mang tính cá nhân cục bộ. Nó không tồn tại lâu hơn một phiên làm việc, và chắc chắn biến mất khi chuyển giao cho thành viên khác.

OpenSpec lấp đầy khoảng trống đó bằng ba tài liệu được commit cho mỗi đợt thay đổi — một đề xuất (proposal), một checklist nhiệm vụ (tasks.md), và một bản đặc tả (spec) mô tả năng lực của hệ thống sau khi hoàn thành. Bản đặc tả này là phần chưa từng có ở đây. Chúng ta có 29 dòng mô tả *công việc*, 16 bản ghi mô tả *quyết định kiến trúc*, nhưng chưa có tài liệu mô tả toàn diện *hệ thống làm được những gì*. Mục 45 của đề bài yêu cầu chính xác điều đó khi bàn giao, và bản phân rã cảnh báo rằng việc viết slice 5 từ trí nhớ vào tuần cuối cùng là cách chắc chắn dẫn đến sai sót. Các bản spec được bồi đắp dần sau mỗi slice hoàn thành chính là phiên bản chuẩn bị sớm và nhẹ nhàng nhất cho tài liệu báo cáo đó.

**Nửa quan trọng hơn công cụ: chỉ có duy nhất một nơi lưu giữ lập luận kỹ thuật.**

Quy trình mặc định của OpenSpec sinh ra một tệp `design.md` cho mỗi thay đổi, nhưng repo này vốn đã có sẵn thư mục `docs/decisions/`. Cả hai đều cùng trả lời câu hỏi "tại sao chúng ta chọn giải pháp này". Hai nơi cùng làm một nhiệm vụ là điều bị nghiêm cấm, và nó sẽ làm xé lẻ chính tài liệu mà mục 45 chấm điểm — một nửa lập luận nằm ở ADR, một nửa nằm ở thư mục change, không bên nào trọn vẹn.

Vì vậy thư mục change của OpenSpec không tạo file `design.md`. Cấu trúc của dự án là `proposal → specs → tasks`, và ba thành phần này trả lời ba câu hỏi hoàn toàn khác nhau: spec nói hệ thống làm được gì, ADR nói tại sao chọn cách đó, task nói bước tiếp theo cần làm gì. Một lựa chọn đủ lớn để tranh luận sẽ trở thành một tệp ADR, và mọi thứ nhỏ hơn chỉ là các đầu việc task được viết cụ thể để không ai phải tự suy luận lại.

Ranh giới giữa một change và một ADR được tự động hóa bằng công cụ:
- Bản đề xuất (proposal) có mục **Decisions** gồm hai dòng: *Settled* dẫn link các ADR nền tảng mà thay đổi dựa vào; *To settle* nêu tên lựa chọn mà nó phải tạo ADR mới, hoặc ghi rõ là không có. Nó chỉ dẫn link chứ không chép lại lập luận.
- Nhóm task 0 của mọi checklist nhiệm vụ luôn là viết bản ghi ADR đó, được sắp xếp trước đoạn code cần dùng nó. Lệnh `pnpm decision "<the choice>"` tự động cấp số tiếp theo, tạo sẵn 3 đề mục và thêm dòng vào index.
- Lệnh `pnpm decision --check` chạy khi commit và từ chối bất kỳ bản ghi nào có đề mục trống hoặc chưa có trong index. Cổng kiểm soát pre-push gate vẫn chặn push nếu đụng vào contracts, schema Prisma hoặc `*.module.ts` mà thiếu ADR đi kèm.

Thư mục `openspec/` được lưu trong git; các skill sinh tự động trong `.claude/` thì không, đúng như quy chuẩn của agent harness.

## What else we looked at (Các phương án khác đã cân nhắc)

**Không dùng gì cả — chỉ giữ thẻ task, ADR và code** — cách đã vận hành trơn tru ở slice 0, không có độ dốc học tập và không thêm công cụ phụ thuộc. Nhưng nó thua ở điểm được chấm: Tài liệu kiến trúc sẽ phải viết ở phút chót từ trí nhớ, và lúc đó các lý lẽ đã bị phai nhạt.

**OpenSpec chỉ dùng cục bộ, gitignore thư mục `openspec/`** — không làm phình hợp đồng chung của repo. Nhưng nó biến bản đặc tả thành ghi chú cá nhân, triệt tiêu phần lớn giá trị chia sẻ của đặc tả.

**Tự viết tay các spec trong thư mục `docs/`** — không phụ thuộc công cụ CLI. Nhưng không có gì ràng buộc spec đồng bộ với các thay đổi mã nguồn, trong khi bước lưu trữ archive của OpenSpec đảm bảo chính xác điều đó.

## Trade-offs (Đánh đổi)

Mỗi tính năng giờ đây có thể kéo theo ba tài liệu — một thẻ task, một thư mục change, và đôi khi một tệp ADR. Đối với một task nhỏ, thủ tục này có thể nhiều hơn bản thân công việc thực tế.

Lệnh `pnpm decision` lấy số thứ tự tiếp theo bằng cách đọc thư mục cục bộ, vì vậy hai nhánh git cùng tạo ADR trong một tuần sẽ có thể lấy trùng số. Khi merge vào nhánh `dev` sẽ phát hiện ra và phải đổi tên một file mà các tài liệu khác đã dẫn link.

Thư mục `openspec/` làm mở rộng hợp đồng chia sẻ chung của repo mà tài liệu `docs/agent-harness.md` luôn cố gắng giữ ở mức tối giản.
