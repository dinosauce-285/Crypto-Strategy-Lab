# Công thức tính toán các chỉ số lợi nhuận, mức sụt giảm drawdown và thống kê

## Why this (Lý do lựa chọn)

Module đánh giá (evaluation) chuyển đổi một danh sách các giao dịch mô phỏng (trades) thành các chỉ số đo lường hiệu suất định lượng (`totalReturn`, `profitLoss`, `winRate`, `tradeCount`, `maxDrawdown`, cùng `profitFactor`, `sharpeRatio` tùy chọn) theo yêu cầu của mục 20 trong đề bài. ADR `0010` đã quyết định rằng `profitMode` và `drawdownMode` là các thuộc tính nằm trong `Dataset`. Đối với Evaluator của task T13, chúng ta xác định công thức toán học cụ thể cho toàn bộ 7 chỉ số:

1. **Tỷ suất lợi nhuận (Return) & Lời/Lỗ (PnL)**:
   - Với mỗi giao dịch $i$, tỷ suất lợi nhuận phần trăm $r_i = \frac{\text{exitPrice} - \text{entryPrice}}{\text{entryPrice}} \cdot \text{sideFactor} - \text{totalFeeRate}$, trong đó $\text{sideFactor} = +1$ cho lệnh Mua (BUY) và $-1$ cho lệnh Bán (SELL).
   - Lợi nhuận ròng theo đồng tiền định giá (quote currency): $\text{netProfit}_i = \text{profit} = \text{exitPrice} \cdot \text{qty} - \text{entryPrice} \cdot \text{qty} - \text{fees}$.
   - **`profitLoss`**: Tổng đại số chính xác $\sum_{i=1}^N \text{netProfit}_i$, được lưu trữ và format dưới dạng chuỗi số thập phân.
   - **`totalReturn`**:
     - `simple`: Tổng tuyến tính các tỷ suất lợi nhuận $\sum_{i=1}^N r_i$.
     - `compound`: Tăng trưởng nhân lãi kép hình học $\prod_{i=1}^N (1 + r_i) - 1$.

2. **Tỷ lệ thắng (Win Rate) & Số lượng giao dịch (Trade Count)**:
   - **`tradeCount`**: Tổng số lượng giao dịch đã đóng $N$.
   - **`winRate`**: Tỷ lệ giữa số giao dịch có lãi ($\text{netProfit}_i > 0$) trên tổng số giao dịch $\frac{N_{\text{win}}}{N} \in [0, 1]$. Trả về $0$ khi $N = 0$.

3. **Mức sụt giảm tài khoản tối đa (Max Drawdown - MDD)**:
   - Chuỗi giá trị tài sản ròng (equity) tích lũy $E_k$ bắt đầu từ $E_0 = 1.0$. Đỉnh tài sản cao nhất đạt được $P_k = \max(P_{k-1}, E_k)$.
   - Mức sụt giảm tại thời điểm $k$: $DD_k = \frac{P_k - E_k}{P_k} \in [0, 1]$.
   - **`trade-close`**: $E_k$ chỉ được cập nhật tại thời điểm kết thúc mỗi giao dịch đã đóng ($k = 1 \dots N$).
   - **`per-candle`**: $E_t$ được cập nhật tại mỗi cây nến $t$ trong suốt thời gian nắm giữ một lệnh đang mở, sử dụng mức giá bất lợi nhất của cây nến đó (giá $\text{low}$ cho lệnh BUY, giá $\text{high}$ cho lệnh SELL).
   - $\text{maxDrawdown} = \max_k(DD_k)$. Trả về $0$ khi $N = 0$.

4. **Hệ số lợi nhuận (Profit Factor) & Chỉ số Sharpe (Sharpe Ratio)**:
   - **`profitFactor`**: $\frac{\sum_{\text{profit}_i > 0} \text{profit}_i}{\sum_{\text{profit}_i < 0} |\text{profit}_i|}$. Trả về `null` khi tổng lỗ bằng $0$ để ngăn lỗi tuần tự hóa giá trị `Infinity` trong JSON và PostgreSQL.
   - **`sharpeRatio`**: $\frac{\bar{r} - r_f}{\sigma_r}$, trong đó $\bar{r} = \frac{1}{N}\sum r_i$, lãi suất phi rủi ro $r_f = 0$, và $\sigma_r$ là độ lệch chuẩn mẫu $\sqrt{\frac{1}{N-1}\sum (r_i - \bar{r})^2}$. Trả về `null` khi $N < 2$ hoặc $\sigma_r = 0$.

## What else we looked at (Các phương án khác đã cân nhắc)

**Viết cứng một công thức tính lãi kép và drawdown theo đóng lệnh duy nhất** — bị từ chối vì backtest giao dịch spot trên các lớp tài sản khác nhau thường cần so sánh lợi nhuận cộng dồn đại số đơn giản, và drawdown trong lúc giữ lệnh khi có bấc nến quét sâu là cực kỳ quan trọng để quản trị rủi ro. Đưa vào cấu hình dataset (ADR `0010`) cho phép linh hoạt cả hai mà không phải sửa code evaluator.

**Trả về `Infinity` cho hệ số lợi nhuận khi tỷ lệ thắng đạt 100%** — bị từ chối vì `Infinity` không phải là cú pháp JSON hợp lệ và không lưu được vào cột SQL kiểu `Float` mà không gây lỗi. Trả về `null` phù hợp hoàn hảo với contracts type.

**Tính toán lợi nhuận lời lỗ bằng số thực dấu phẩy động (float)** — bị từ chối vì sai số trôi dạt dấu phẩy động tạo ra sự chênh lệch nhỏ không đáng có giữa các lần chạy. Số tiền được giữ nguyên dạng chuỗi số thập phân (ADR `0016`) và cộng bằng số học thập phân chính xác.

## Trade-offs (Đánh đổi)

Chế độ tính drawdown `per-candle` đòi hỏi phải truyền danh sách các cây nến lịch sử vào service evaluator khi dataset bật chế độ này, trong khi chế độ `trade-close` chỉ cần duy nhất mảng `Trade[]`.

Trả về `null` cho `profitFactor` và `sharpeRatio` khi chưa xác định được đòi hỏi bộ lọc sắp xếp trên giao diện leaderboard (task T18) phải xử lý các giá trị `null` ở vị trí xếp hạng thấp nhất hoặc chưa xếp hạng.
