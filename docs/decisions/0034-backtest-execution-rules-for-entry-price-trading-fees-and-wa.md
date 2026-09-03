# Quy tắc thực thi backtest cho giá vào lệnh, phí giao dịch và warm-up

## Why this (Lý do lựa chọn)

Mô phỏng backtest phải phản ánh chính xác điều kiện giao dịch thực tế đồng thời bảo toàn tính tái lập tuyệt đối và tính nhân quả (Quy tắc bất khả xâm phạm số 7, mục 19 & 36 đề bài). ADR `0010` đã quyết định rằng các quy tắc thực thi backtest nằm bên trong bản ghi `Dataset` chứ không nằm trong các hằng số toàn cục của engine. Đối với Backtest Engine của task T12, chúng ta thiết lập cơ chế thực thi cụ thể cho ba quy tắc cốt lõi:

1. **Thời điểm khớp giá vào lệnh (Entry price timing)**:
   - `next-open` (mặc định): Một tín hiệu phát ra ở cây nến $t$ sẽ vào lệnh tại giá mở cửa của cây nến $t+1$. Đây là giả định chuẩn mực và thực tế nhất, bởi vì một tín hiệu tính toán dựa trên giá đóng cửa của nến $t$ chỉ có thể được thực thi sau khi nến $t$ đã đóng hoàn toàn và nến $t+1$ bắt đầu mở ra.
   - `signal-close`: Tín hiệu vào lệnh ngay tại giá đóng cửa của chính cây nến $t$. Hỗ trợ cho các mô hình lý thuyết giả định độ trễ bằng 0.
2. **Phí giao dịch (Trading fees)**:
   - Phí được khấu trừ ở cả hai chiều vào lệnh và đóng lệnh (entry và exit) dựa trên tỷ lệ `dataset.rules.feeRate` (ví dụ `"0.001"` tương ứng với phí spot chuẩn 0.1% của Binance).
   - Lợi nhuận ròng của một giao dịch tính cả hai chiều phí: $\text{profit} = \text{grossProfit} - (\text{entryFee} + \text{exitFee})$.
3. **Số nến làm ấm dữ liệu (Warmup resolution)**:
   - Số nến warm-up thực tế $\text{warmup} = \max(\text{dataset.rules.warmupCandles}, \text{strategy.meta.warmup})$.
   - Engine đảm bảo các nến lịch sử trước mốc $\text{warmup}$ vẫn được nạp vào các bộ tính toán chỉ báo để làm ổn định chuỗi dữ liệu (ví dụ RSI 14 chu kỳ, SMA 200 chu kỳ), nhưng tuyệt đối không sinh ra bất kỳ lệnh giao dịch nào trước mốc index $\text{warmup}$.

## What else we looked at (Các phương án khác đã cân nhắc)

**Ghi cứng các hằng số trong mã nguồn engine** — viết cứng `next-open`, phí 0.1%, và 50 nến warm-up trong code của backtester. Phương án này bị loại bỏ vì các sàn giao dịch và các lớp tài sản khác nhau có biểu phí khác nhau, và các khung thời gian khác nhau đòi hỏi độ dài warm-up khác nhau. Đặt quy tắc trong dataset (ADR `0010`) ngăn chặn việc âm thầm làm sai lệch bảng xếp hạng các thử nghiệm trong quá khứ.

**Mô phỏng khớp lệnh tức thời theo từng tick bên trong cây nến** — mô phỏng biến động giá chi tiết bên trong cây nến trong lúc backtest. Bị loại bỏ vì độ hạt của dữ liệu dataset là cấp độ nến (OHLCV). Mô phỏng khớp lệnh bên trong nến khi không có dữ liệu sổ lệnh cấp độ L2/L3 đầy đủ sẽ tạo ra các giả định nhìn trước tương lai nhân tạo và làm mất tính tất định giữa các lượt chạy.

## Trade-offs (Đánh đổi)

Quy tắc khớp lệnh `next-open` đòi hỏi tập dữ liệu dataset phải có ít nhất thêm một cây nến sau cây nến phát tín hiệu thì mới có thể thực hiện vào lệnh.

Việc lấy giá trị lớn nhất ($\max$) giữa warm-up của dataset và warm-up của chiến lược đồng nghĩa với việc các dataset khai báo warm-up nhỏ hơn một chiến lược đa chỉ báo phức tạp sẽ tự động hoãn việc vào lệnh cho đến khi đạt đủ số nến warm-up lớn nhất mà chỉ báo yêu cầu.
