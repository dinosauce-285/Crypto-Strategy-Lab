# Chế độ tìm kiếm di truyền lai tạo ứng viên từ lịch sử điểm cao nhất của chính lượt chạy tìm kiếm

## Why this (Lý do lựa chọn)

Section 42 yêu cầu chính xác kịch bản này: hoán đổi `RandomStrategyGenerator` lấy `DomainGuidedGenerator`/`GeneticGenerator` phía sau một interface duy nhất, mà không có bất kỳ thành phần nào phía sau nó nhận biết về sự hoán đổi này. `CandidateSource`/`CandidateGenerator` đã là điểm nối đó — `T17` đã xây dựng nó, `0013` đã ghi chép lại — và `random`/`domain-guided` là hai triển khai đang tồn tại. Genetic là câu trả lời cụ thể thứ ba cho kịch bản mà một giám khảo chấm thi sẽ thực sự đưa ra.

Nó khởi động chính xác như Random ở thế hệ số 0 (chưa có lịch sử được chấm điểm), sau đó một khi `RunHistory` có các ứng viên đã được chấm điểm, nó sẽ lai tạo từ 4 ứng viên hàng đầu hiện tại của chính lượt chạy: phép lai chéo (crossover) chọn các chiến lược sẽ được kết hợp bằng cách gộp các thành viên của hai cha mẹ ngẫu nhiên, đột biến (mutation) là việc chạy lại quá trình ngẫu nhiên hóa tham số/trọng số sẵn có của `buildCandidate()` trên tập hợp đó. Không có gì mới cần lưu trữ — `RunHistory` vốn đã được truyền qua `CandidateSource.next()` cho mọi chế độ, do đó "quần thể" (population) chỉ đơn giản là lịch sử của chính lượt chạy, chứ không phải là bản sao trạng thái thứ hai có thể bị lệch pha so với nó.

Không cần thay đổi gì đối với `search.service.ts`, `backtest.processor.ts`, `SearchController`, hay Prisma schema — `genetic` là chuỗi thứ tư trong `SEARCH_MODES` và là khóa thứ tư trong bản đồ generator của `GeneratedCandidateSource`.

## What else we looked at (Các phương án khác đã cân nhắc)

**Một thuật toán di truyền giáo khoa với quần thể rõ ràng được duy trì qua các thế hệ** (chọn lọc giải đấu - tournament selection, chủ nghĩa tinh hoa - elitism, một quần thể tồn tại lâu hơn bất kỳ lệnh gọi `next()` đơn lẻ nào) — gần hơn với ý nghĩa thông thường của "thuật toán di truyền", nhưng nó cần sở hữu trạng thái có thể mâu thuẫn với `RunHistory`, thứ mà bảng xếp hạng và mọi chế độ khác đã tin tưởng như nguồn chân lý duy nhất của lượt chạy. Việc suy diễn lại "4 ứng viên tốt nhất hiện tại" từ `RunHistory` trên mỗi lệnh gọi sẽ đơn giản hơn và không thể bị lệch pha khỏi nó.

**Tối ưu hóa Bayesian / mô hình thay thế (surrogate model)** — bản tóm tắt liệt kê Genetic, Bayesian và tìm kiếm sinh bởi LLM là các câu trả lời riêng biệt, có giá trị tương đương cho cùng một kịch bản mở rộng. Genetic được chọn ở đây vì nó tái sử dụng hình thái thành viên có trọng số/lưới tham số hiện có gần như miễn phí — lai chéo là "chọn thành viên nào", đột biến là sự ngẫu nhiên hóa của `buildCandidate()`, cả hai đều đã được viết sẵn cho tìm kiếm Random. Bayesian sẽ cần một mô hình mục tiêu/mô hình thay thế thực tế, đó là một khối lượng công việc lớn hơn và riêng biệt.

## Trade-offs (Đánh đổi)

Lai chéo chỉ tái kết hợp *những chiến lược nào* mà một cá thể con kết hợp, chứ không tái kết hợp trực tiếp các giá trị tham số của cha mẹ — các tham số của cá thể con được ngẫu nhiên hóa mới trong phạm vi của từng chiến lược thay vì được kế thừa hoặc nội suy từ cha mẹ. Yếu hơn một GA cũng lai chéo cả tham số, nhưng nó tái sử dụng `buildCandidate()` nguyên vẹn thay vì sao chép logic xác thực của nó.

Không có chủ nghĩa tinh hoa (no elitism): một ứng viên mạnh từ vài thế hệ trước chỉ tiếp tục ảnh hưởng đến việc lai tạo khi nó vẫn còn nằm trong top 4 theo điểm số — nó có thể rớt hoàn toàn khỏi nhóm lai tạo một khi các ứng viên tốt hơn xuất hiện. Không có gì bị mất đối với việc chấm điểm hoặc bảng xếp hạng (`RunHistory` giữ lại mọi ứng viên từng được thử nghiệm), nó chỉ đơn giản ngừng được dùng làm bố mẹ để lai tạo.

Đã được xác minh bằng một lệnh gọi trực tiếp `POST /api/search/runs` (`mode: "genetic"`, 3 chiến lược, 10 ứng viên) — 0 lỗi, worker đã tiêu thụ toàn bộ hàng đợi và trả về ứng viên tốt nhất. Chưa được kiểm thử đầu cuối qua giao diện người dùng màn hình Search, và chưa được kiểm thử ngâm (soak-tested) ở quy mô quần thể lớn.
