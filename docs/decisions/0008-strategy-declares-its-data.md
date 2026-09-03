# Chiến lược tự khai báo dữ liệu cần dùng, và engine chuẩn bị dữ liệu đó

## Why this (Lý do lựa chọn)

Một chiến lược trả lời duy nhất một câu hỏi trên mỗi cây nến, và để trả lời được nó cần những con số mà nó không tự nắm giữ: một đường trung bình động (MA) trên 20 cây nến gần nhất, một chỉ số RSI, hay điểm sentiment lưu kèm các bài báo ngày hôm nay. Câu hỏi đặt ra là: ai sẽ tạo ra những con số đó và làm thế nào chúng đến được với chiến lược?

Có hai phương án bị loại bỏ ngay từ đầu trước khi bước vào lựa chọn thực sự: Một chiến lược không thể tự tính toán chúng, vì cùng một đường MA sẽ bị tính lại hàng chục nghìn lần bởi mỗi ứng viên trong một lượt tìm kiếm lớn, và điểm sentiment hoàn toàn không thể tính toán từ các cây nến. Nó cũng không thể tự truy vấn cơ sở dữ liệu, điều mà mục 44 liệt kê vào danh sách các lỗi thiết kế nghiêm trọng bị trừ điểm.

Phương án được chọn là chiến lược sẽ tự công bố nhu cầu dữ liệu của mình ngay từ đầu. Chiến lược trả lời hàm `requires(params)` bằng một danh sách — chỉ báo này với các tham số này, nguồn dữ liệu này trên cửa sổ thời gian này — và engine sẽ đọc câu trả lời của mọi thành viên trước khi lượt chạy bắt đầu, chuẩn bị chính xác lượng dữ liệu đó một lần duy nhất cho dataset, rồi chuyển giao cho chiến lược. Hàm `analyze()` sau đó chỉ việc đọc những gì đã được chuẩn bị sẵn; nó tuyệt đối không kích hoạt thêm bất kỳ tác vụ tính toán hay truy vấn nào.

Việc engine biết trước nhu cầu dữ liệu tạo nên toàn bộ sự khác biệt và mang lại ba lợi ích lớn: Một tên gọi không tồn tại sẽ báo lỗi ngay khi chiến lược được đăng ký vào registry thay vì ném lỗi giữa chừng trong một lượt backtest. Một nguồn dữ liệu cần phải fetch từ ngoài thay vì tính từ nến — như điểm sentiment đã lưu (mục 30) — sẽ được fetch trọn vẹn cho toàn bộ khoảng thời gian trong đúng một câu truy vấn SQL thay vì truy vấn lắt nhắt trên từng cây nến. Và việc chuẩn bị dữ liệu cho một ứng viên là một khối lượng công việc xác định rõ ràng trước khi vòng lặp mở ra, đây là phiên bản trung thực của tính toán song song mà mục 43 hỏi đến.

Chi phí triển khai phương án này cũng nhẹ nhàng hơn vẻ ngoài của nó, vì hai quyết định lân cận đã đặt sẵn cơ chế ở đó: ADR 0010 yêu cầu mỗi chiến lược tự khai báo id, nhóm và danh sách tham số để form nhập liệu và không gian tìm kiếm có thể sinh tự động thay vì viết cứng; danh sách nhu cầu dữ liệu chỉ là thêm một trường vào bản khai báo đó. Và ADR `0006` cũng đã yêu cầu chiến lược tự khai báo độ dài warm-up của chính nó. Tự khai báo thông tin về bản thân là pattern mà codebase này đang áp dụng xuyên suốt; việc truy vấn động tại nơi sử dụng sẽ là một pattern thứ hai trùng lặp cho cùng một bài toán.

Bản khai báo là một hàm phụ thuộc vào các tham số (`params`), không phải là một danh sách tĩnh cố định. Search engine sẽ biến thiên các con số — ứng viên này dùng RSI 14, ứng viên tiếp theo dùng RSI 21 — vì vậy một danh sách tĩnh sẽ bị sai ngay ở lượt bốc tham số thứ hai. Nhu cầu dữ liệu của một tổ hợp chiến lược chính là hợp (union) nhu cầu của tất cả các chiến lược thành viên.

## What else we looked at (Các phương án khác đã cân nhắc)

**Một gateway cho phép truy vấn động** — gọi `ctx.indicator('rsi', {period: 14})` trực tiếp tại nơi sử dụng, được tính toán ở lần hỏi đầu tiên và lưu cache lại. Đây là phương án suýt chút nữa đã thắng, và tài liệu gợi ý đề bài từng hướng tới cách này. Nó không có sự trùng lặp: nhu cầu được nêu đúng một lần duy nhất ngay tại nơi nó được dùng. Với một lớp cache có khóa là dataset, indicator và params, nó cũng tính toán mỗi chỉ báo đúng một lần, do đó hầu hết lập luận về hiệu năng của việc khai báo trước thực chất là lập luận của việc cache. Thứ mà nó không thể làm được là báo trước cho engine trước lượt chạy: một tên chỉ báo gõ sai chính tả chỉ lộ ra ở cây nến đầu tiên thay vì lúc đăng ký, một nguồn dữ liệu ngoài sẽ bị kéo về một cách lười biếng (lazy fetch) trừ khi gateway được viết khéo léo để mở rộng request đầu tiên ra toàn dải nến, và không có gì được chuẩn bị trước vì không có gì được biết trước. Chúng ta chấp nhận một chút lặp lại để đổi lấy sự chuẩn bị chắc chắn đó.

**Một struct cố định chứa sẵn mọi trường dữ liệu (chiếc khay bưng sẵn)** — dễ đọc nhất, nhưng sai theo đúng cách mà mục 41 của đề bài được viết ra để vạch trần. Việc thêm một nguồn dữ liệu mới sẽ làm thay đổi cấu trúc struct đó, và kéo theo sự thay đổi ở mọi nơi xây dựng nó: worker, endpoint biểu đồ, và test case của mọi chiến lược. Một bài test cho chiến lược Moving Average sẽ cần phải có dữ liệu tin tức trên tay chỉ để dựng một context giả lập. Nó cũng tính toán toàn bộ mọi chỉ báo cho mọi chiến lược trong khi mỗi chiến lược chỉ dùng có một hoặc hai chỉ báo.

**Dùng Dependency Injection của NestJS làm cơ chế** — cần nhắc đến vì có tài liệu từng đề cập. Nó hoàn toàn không phù hợp. DI giải quyết phụ thuộc theo kiểu dữ liệu tại thời điểm khởi động ứng dụng (startup time), trong khi nhu cầu ở đây là `rsi` với chu kỳ mà bộ sinh ngẫu nhiên chọn trúng ở vòng này. Việc đọc bản khai báo, chuẩn bị dữ liệu và chuyển giao bắt buộc phải viết bằng logic tường minh. Dù vậy NestJS vẫn phát huy vai trò chuẩn mực của nó: registry là một provider, và một indicator service dùng chung được inject vào cả worker lẫn endpoint biểu đồ.

## Trade-offs (Đánh đổi)

Nhu cầu bị viết hai lần — một lần trong `requires()`, một lần tại nơi nó được dùng — và hai vị trí này phải được giữ đồng bộ thủ công. Đây là sự vi phạm nguyên tắc DRY thực sự và là cái giá có chủ đích của quyết định này, không phải là sơ suất. Khai báo thừa làm lãng phí công sức chuẩn bị dữ liệu; khai báo thiếu sẽ làm gãy chương trình tại thời điểm sử dụng. Engine vận hành rất nghiêm ngặt — yêu cầu bất kỳ chỉ báo nào chưa khai báo sẽ ném lỗi ngay — nhờ đó sự lệch pha sẽ bị bắt gặp thay vì âm thầm phục vụ, nhưng nó bị bắt ở thời điểm chạy (runtime).

Xuất hiện một bước chuẩn bị dữ liệu (preparation step) mới có thể thất bại trước khi bất kỳ chiến lược nào kịp chạy phân tích.

Một chiến lược không thể tự ý phát hiện thêm nhu cầu dữ liệu mới giữa chừng trong một lượt chạy. Không có chiến lược nào trong danh sách đề bài hoạt động theo kiểu đó, nhưng nếu sau này có, hệ thống sẽ cần mở thêm một gateway truy vấn hẹp bên cạnh bản khai báo.

Thành viên viết hai chiến lược đầu tiên đồng thời phải viết luôn cơ chế khai báo này, khiến task T11 gánh thêm khối lượng công việc mà một gateway thông thường không đòi hỏi, trong khi các task T12, T16 và T25 phải chờ chữ ký hàm `analyze()` được chốt xong.
