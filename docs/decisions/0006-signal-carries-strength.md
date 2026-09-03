# Tín hiệu mang theo chiều hướng và độ mạnh

## Why this (Lý do lựa chọn)

Một chiến lược trả lời duy nhất một câu hỏi trên mỗi cây nến: mua, bán, hay không làm gì. Câu hỏi đặt ra ở đây là liệu nó có được phép cho biết mức độ tự tin (confidence) của nó hay không?

Có thể. Đối tượng `Signal` bao gồm một chiều hướng (direction) cùng một độ mạnh (strength) nằm trong khoảng từ 0 đến 1, và một chiến lược không có thông tin bổ sung sẽ trả về giá trị mặc định là 1.

Hai yêu cầu bắt buộc dẫn tới quyết định này. Mục 14 yêu cầu kết hợp có trọng số (weighted combination) nhiều chiến lược. Với ba giá trị rời rạc thông thường (BUY/SELL/HOLD), thứ duy nhất mà trọng số có thể nhân vào là +1 hoặc -1, khiến cho điểm số tổng hợp chỉ có thể rơi vào một tập hợp nhỏ các giá trị cố định được định sẵn — điều đó thực chất chỉ là đếm phiếu bầu với các hệ số cố định, và việc gọi nó là "kết hợp có trọng số" trong báo cáo sẽ chỉ là mô tả một thứ mà code không hề làm. Mục 30 thậm chí còn rõ ràng hơn: tin tức được lưu với điểm sentiment cụ thể ví dụ 0.82 bên cạnh bài báo, và một tín hiệu rời rạc sẽ buộc phải làm phẳng giá trị đó thành `BUY` ngay tại ranh giới interface, vứt bỏ con số duy nhất tạo nên ý nghĩa cho chiến lược đó.

Độ mạnh là một tập cha (superset) mở rộng chứ không phải một hướng đi khác biệt. Bất kỳ chiến lược nào trả về độ mạnh bằng 1 đều hoạt động hoàn toàn y hệt như phiên bản rời rạc, do đó độ mạnh chỉ cần áp dụng ở những nơi có ý nghĩa đo lường rõ ràng — RSI dựa trên khoảng cách vượt ngưỡng, Bollinger dựa trên %B, sentiment dựa trên điểm số đã lưu — và giữ nguyên giá trị 1 ở tất cả các chiến lược còn lại.

Có hai hệ quả kéo theo từ quyết định này và phải được hiểu đúng: Thứ nhất, độ mạnh là độ tự tin của một chiến lược đối với chính nó và không thể so sánh trực tiếp giữa hai chiến lược khác nhau; bộ kết hợp tổng hợp nhân nó vào chính trọng số của chiến lược đó chứ không dùng nó để xếp hạng chiến lược này hơn chiến lược kia. Thứ hai, một chiến lược chưa có đủ dữ liệu để phân tích — cần 50 cây nến nhưng mới có 10 nến — tuyệt đối không biểu thị điều đó qua tín hiệu. Nó tự khai báo số nến warm-up cần thiết trong metadata và engine sẽ không gọi nó cho đến khi có đủ dữ liệu, đảm bảo trạng thái "không làm gì" (HOLD) luôn giữ đúng ý nghĩa trung thực duy nhất của nó.

## What else we looked at (Các phương án khác đã cân nhắc)

**Ba giá trị rời rạc (BUY / SELL / HOLD)** — mô hình mà chính đề bài phác thảo trong mục 6, và là điều mà người đọc tự nhiên kỳ vọng chúng ta chọn. Đây là phương án dễ làm nhất và không thể hiểu lầm: `BUY` tự giải thích ý nghĩa của nó, không ai phải nghĩ ra thang đo độ mạnh. Nhưng nó thất bại trước hai yêu cầu nêu trên, và nếu sau này muốn đổi lại thì sẽ phải sửa code của mọi chiến lược hiện có — kịch bản mục 41 thất bại ngay trên hợp đồng của chính chúng ta.

**Một con số thực duy nhất từ -1 đến +1** — tính toán gọn gàng hơn vì kết hợp tổng hợp chỉ là một tổng có trọng số thuần túy không cần mã hóa. Nhưng nó gộp hai trạng thái hoàn toàn khác nhau về số 0: "Tôi không có ý kiến gì" và "Hai phe mua bán đang cân bằng nhau tuyệt đối". Hai trạng thái đó rất khác biệt khi thực hiện kiểm phiếu, trong khi mục 13 nêu biểu quyết đa số (majority vote) là một cách kết hợp hợp lệ, do đó việc xóa nhòa ranh giới này làm mất đi một phương án mà đề bài gợi ý. Ngoài ra, việc đọc giá trị `-0.35` trong một test case bị fail sẽ ít trực quan hơn nhiều so với việc nhìn thấy chữ `SELL`.

**Chiều hướng, độ mạnh kèm một chuỗi lý do (reason string)** — một đoạn giải thích bằng chữ mà mỗi chiến lược đính kèm để hiển thị lên biểu đồ theo mục 25. Nhưng chuỗi text này không dùng được cho bất kỳ mục đích nào khác ngoài hiển thị, và các giá trị chỉ báo mà biểu đồ cần thì service indicator đã tự sinh ra đầy đủ. Trường dữ liệu này bản chất là tùy chọn (optional), vì vậy có thể bổ sung sau khi có component thực sự cần đến.

## Trade-offs (Đánh đổi)

Không có một thang đo chuẩn hóa chung tuyệt đối. Mức 0.8 từ chiến lược Moving Average và mức 0.8 từ chiến lược Hỗ trợ/Kháng cự mang ý nghĩa bản chất khác nhau, nhưng bộ kết hợp vẫn cộng chúng vào cùng một tổng. Quy ước nêu trên giúp khoanh vùng rủi ro thay vì loại bỏ nó hoàn toàn, và nó chỉ đứng vững chừng nào các thành viên tuân thủ nghiêm túc.

Trường dữ liệu này sẽ là vô nghĩa trừ khi bộ kết hợp thực sự nhân trọng số với nó. Nếu quy tắc kết hợp cuối cùng chỉ là đếm phiếu bầu thông thường, chúng ta sẽ để lại một trường dư thừa trong contract chung không làm gì cả và gây hiểu lầm cho người đọc — tệ hơn nhiều so với việc chọn phương án ba giá trị rời rạc ngay từ đầu. Đó là lý do quy tắc kết hợp (weighted merge) được chốt đồng thời ngay trong đợt thảo luận này.

Mỗi lập trình viên khi viết một chiến lược mới sẽ phải quyết định thêm một tham số, và đối với một số chỉ báo thì không có câu trả lời tự nhiên. Sự giao cắt (crossover) chỉ có hai trạng thái: đã xảy ra hoặc chưa xảy ra; bất kỳ độ mạnh nào gán cho nó đều là sự suy đoán chủ quan về khoảng cách giữa hai đường chứ không phải một sự thật hiển nhiên. Trả về giá trị 1 luôn là lựa chọn sẵn có, nhưng câu hỏi này giờ đây bắt buộc phải đặt ra mỗi lần viết chiến lược mới trong khi trước đây nó không hề tồn tại.
