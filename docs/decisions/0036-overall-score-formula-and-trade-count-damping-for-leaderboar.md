# Công thức tính Overall Score và hệ số giảm chấn số lượng giao dịch cho bảng xếp hạng

## Why this (Lý do lựa chọn)

Section 21 và Section 35 yêu cầu điểm số xếp hạng tổng thể (overall ranking score) phải được định nghĩa tường minh, có cơ sở toán học vững chắc, và có khả năng cân bằng giữa lợi nhuận so với rủi ro cũng như độ tin cậy thống kê.

Cách xếp hạng ngây thơ chỉ dựa thuần túy vào Tổng lợi nhuận (Total Return) hoặc Tỷ lệ thắng (Win Rate) sẽ dẫn đến các kết quả bất thường: một ứng viên chỉ có 2 giao dịch may mắn đạt tỷ lệ thắng 100% lại xếp trên một ứng viên đã được chứng minh qua 80 giao dịch với tỷ lệ thắng 65%; hoặc một chiến lược kiếm được 30% lợi nhuận nhưng chịu mức sụt giảm vốn (drawdown) thảm khốc 60% lại vượt mặt chiến lược đạt 25% lợi nhuận với mức sụt giảm chỉ 5%.

Chúng tôi định nghĩa điểm số tổng hợp Overall Score (phiên bản công thức `v1`) như sau:

1. **Điểm cơ sở (Base Score)**:
   \[
   \text{BaseScore} = 0.40 \times \text{totalReturn} + 0.20 \times \text{winRate} - 0.30 \times \text{maxDrawdown} + 0.10 \times \max\left(0, \frac{\text{sharpeRatio}}{3}\right)
   \]
   - Khả năng sinh lời (`totalReturn`, trọng số 0.40) tưởng thưởng cho sự tăng trưởng vốn.
   - Tính nhất quán (`winRate`, trọng số 0.20, khoảng giá trị [0, 1]) tưởng thưởng cho tỷ lệ lệnh thắng.
   - Phạt rủi ro (`maxDrawdown`, trọng số 0.30, khoảng giá trị [0, 1]) phạt mức sụt giảm vốn từ đỉnh xuống đáy.
   - Chất lượng điều chỉnh theo rủi ro (`sharpeRatio`, trọng số 0.10, chuẩn hóa theo thang đo chuẩn là 3.0) tưởng thưởng cho lợi nhuận vượt trội ổn định trên mỗi đơn vị biến động.

2. **Hệ số giảm chấn độ tin cậy theo số lượng giao dịch (Trade Count Confidence Damping)**:
   Để ngăn chặn thiên lệch mẫu nhỏ mà không loại bỏ sớm các ứng viên mới sinh, một hệ số giảm chấn độ tin cậy dạng căn bậc hai phi tuyến tính được áp dụng:
   \[
   \text{Confidence}(N) = \min\left(1.0, \sqrt{\frac{N}{N_{\text{threshold}}}}\right) \quad \text{với } N_{\text{threshold}} = 20
   \]
   \[
   \text{OverallScore} = \text{BaseScore} \times \text{Confidence}(N)
   \]

3. **Đánh dấu phiên bản công thức (Formula Versioning)**:
   Công thức được gắn nhãn `SCORE_FORMULA_VERSION = 'v1'`. Khi tiêu chí chấm điểm phát triển theo thời gian, việc nâng mã định danh phiên bản sẽ đảm bảo khả năng kiểm toán dữ liệu (ADR 0011).

## What else we looked at (Các phương án khác đã cân nhắc)

- **Chỉ sắp xếp theo Lợi nhuận thô hoặc Sharpe đơn thuần** — đơn giản khi triển khai, nhưng vi phạm yêu cầu của Section 21. Sharpe thuần túy gặp lỗi khi lợi nhuận âm hoặc số lượng giao dịch quá ít, còn lợi nhuận thuần túy lại cổ súy đòn bẩy liều lĩnh.
- **Ngưỡng số lượng giao dịch cứng (ví dụ: \(N < 10 \implies \text{loại}\))** — tạo ra bước nhảy gián đoạn nơi 9 giao dịch nhận điểm 0 còn 10 giao dịch nhận trọn điểm. Hệ số giảm chấn phi tuyến mượt mà cho phép các phát hiện tìm kiếm ban đầu được hiển thị trong khi vẫn ưu tiên các mẫu dữ liệu đã trưởng thành.
- **Giảm chấn tuyến tính (\(N / 20\))** — phạt quá nặng các mẫu giao dịch quy mô trung bình (ví dụ 10 giao dịch sẽ mất tới 50% điểm). Giảm chấn theo căn bậc hai \(\sqrt{10/20} \approx 0.71\) mang lại đường cong tin cậy thống kê cân bằng hơn.

## Trade-offs (Đánh đổi)

- Trọng số (0.40 lợi nhuận, 0.20 tỷ lệ thắng, 0.30 drawdown, 0.10 Sharpe) phản ánh ưu tiên giao dịch swing cân bằng. Các chế độ thị trường hoặc mức chấp nhận rủi ro khác nhau có thể coi trọng việc phòng tránh drawdown hơn; việc tính toán lại khi đọc dữ liệu (ADR 0011) đảm bảo các điều chỉnh chỉ cần sửa query của bộ tính toán thay vì phải chạy lại cơ sở dữ liệu.
- Sharpe ratio được khống chế ở mức đóng góp không âm trong điểm cơ sở để Sharpe âm không bị phạt trùng hai lần cùng với sụt giảm vốn (drawdown).
