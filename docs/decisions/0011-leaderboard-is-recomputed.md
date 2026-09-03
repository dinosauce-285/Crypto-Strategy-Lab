# Bảng xếp hạng được tính toán lại trực tiếp từ các experiment trên mỗi lần đọc

## Why this (Lý do lựa chọn)

Mục 35 của đề bài hỏi trực tiếp về vấn đề này và yêu cầu nêu rõ lập luận kỹ thuật, vì vậy lập luận thuyết phục chính là sản phẩm bàn giao quan trọng hơn bản thân lựa chọn.

Căn cứ cốt lõi bắt nguồn từ mục 21. Đề bài yêu cầu phải nêu rõ công thức tính điểm tổng hợp, và một công thức khi được viết ra và phải bảo vệ trước hội đồng chắc chắn sẽ bị điều chỉnh nhiều lần trước khi nộp bài — thay đổi trọng số, phạt nặng hơn mức sụt giảm drawdown, bổ sung số lượng giao dịch tối thiểu. Nếu lưu sẵn điểm số và thứ hạng vào database, mỗi lần điều chỉnh công thức sẽ buộc chúng ta phải chạy một đợt cập nhật chấm điểm lại toàn bộ các thử nghiệm trong kho dữ liệu trước khi bảng xếp hạng hiển thị trung thực trở lại. Nếu tính toán lại trực tiếp (recomputation), việc này chỉ đơn giản là sửa một câu truy vấn SQL và tải lại trang web.

Tải tính toán thực tế là rất nhỏ. Bảng xếp hạng là một câu truy vấn Top-K trên các experiment của một dataset cụ thể, thực chất chỉ là một lệnh `ORDER BY` kèm `LIMIT` trên vài nghìn dòng dữ liệu — loại câu lệnh mà PostgreSQL phản hồi trong chớp mắt mà không tốn tài nguyên. Không có yếu tố nào trong đồ án này vượt quá quy mô đó: các experiment tích lũy ở mức hàng nghìn chứ không phải hàng triệu.

Chưa sử dụng cache ở giai đoạn này. Khuyến nghị ban đầu là "tính toán lại, chỉ thêm cache khi thấy chậm", và vế sau là phần được chủ động trì hoãn có chủ đích: lớp cache tạo ra một bản sao dữ liệu có thể bị cũ (stale), và một bảng xếp hạng bị cũ là lỗi không ai nhận ra được, bởi vì một thứ hạng sai trông vẫn y hệt như một thứ hạng đúng. Việc thêm cache là một quyết định cần dựa trên số liệu đo đạc thực tế, và sẽ có bản ghi ADR riêng khi điều đó xảy ra.

Điều này cũng giúp giữ cho ADR `0003` luôn trung thực. Một ứng viên chạy xong sẽ phát sự kiện `backtest.completed` và `strategy.evaluated` lên bus; module ranking lắng nghe và thông báo cho giao diện biết bảng nào vừa có biến động, tuyệt đối không gửi kèm nội dung bảng hiện tại; giao diện sẽ tự động đọc lại. Không thành phần nào lưu cứng thứ hạng, do đó không thể xảy ra tình trạng thứ hạng mâu thuẫn với các experiment đã sinh ra nó.

## What else we looked at (Các phương án khác đã cân nhắc)

**Lưu cứng điểm số và thứ hạng vào bảng** — tốc độ đọc nhanh nhất, và là câu trả lời hiển nhiên nếu công thức tính điểm là bất biến. Nhưng hai chi phí đã đánh chìm phương án này: Mỗi lần đổi công thức sẽ phải quét tính điểm lại toàn bộ cơ sở dữ liệu, và trong suốt quá trình đó bảng xếp hạng sẽ bị sai. Và một thứ hạng lưu cứng là nguồn sự thật thứ hai (second source of truth): nó có thể không khớp với các experiment gốc, và khi xảy ra lệch pha thì không có gì cảnh báo cho bạn biết.

**Tính toán lại kết hợp gắn cache ngay từ ngày đầu** — phương án dung hòa và có thể biện minh được. Nhưng chúng ta bắt đầu trước một bước vì việc đưa cache vào trước khi có một truy vấn thực sự chậm là thêm một bộ phận chuyển động thừa thãi không giải quyết được gì, và lỗi đặc thù mà nó sinh ra — một bản sao cũ bị tưởng nhầm là dữ liệu mới nhất — là dạng lỗi khó phát hiện nhất trên một trang đầy số liệu.

## Trade-offs (Đánh đổi)

Mỗi lần đọc đều phải quét qua các experiment của một dataset. Chúng ta đang giả định rằng việc này không đáng kể ở quy mô vài nghìn dòng dữ liệu thay vì chứng minh bằng số đo thực tế. Nếu một lượt tìm kiếm kéo dài hơn nhiều so với dự tính, đây sẽ là quyết định đầu tiên cần phải xem xét lại.

Bởi vì điểm số được tính toán lại thay vì lưu cứng, việc thay đổi công thức sẽ âm thầm sắp xếp lại toàn bộ kết quả trong quá khứ. Điều này đúng về mặt logic — mọi dòng dữ liệu khi đó đều được chấm theo cùng một thang đo — nhưng đồng nghĩa với việc ảnh chụp màn hình bảng xếp hạng tuần trước không thể tái hiện lại y hệt hôm nay. ADR `0036` đã bổ sung giải pháp cho việc này: công thức tính điểm được đánh phiên bản `v1` và mỗi mục hiển thị đều mang theo phiên bản công thức đã chấm nó. Việc sắp xếp lại vẫn diễn ra, nhưng người đọc giờ đây biết rõ mình đang nhìn vào công thức nào thay vì màn hình hiển thị một công thức mà hệ thống không còn dùng nữa.

Bảng xếp hạng chỉ nhất quán khi đi kèm bộ lọc dataset: nó bắt buộc phải luôn được đọc cho một dataset cụ thể, không bao giờ đọc gộp nhiều dataset, nếu không nó sẽ so sánh các lượt chạy bị phán quyết bởi các quy tắc khác nhau — điều mà ADR `0010` sinh ra để ngăn chặn.
