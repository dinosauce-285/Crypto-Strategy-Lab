# Search worker đánh giá và ghi nhận thực nghiệm thông qua EvaluatorPort, không dùng repository riêng của nó

## Why this (Lý do lựa chọn)

BUG-01: mọi ứng viên Search đều thất bại ở bước đánh giá (thử 15, hỏng cả 15, đều cùng một lỗi). `BacktestProcessor` (worker của T12) phụ thuộc vào `RunEvaluator` (`score(trades, datasetId): Promise<Metrics>`), một port trừu tượng hoàn toàn không có lớp triển khai nào trong repository, và không có gì ràng buộc nó trong `backtest-worker.module.ts`. Trình đánh giá thực sự của T13, `EvaluatorService`, triển khai một port hoàn toàn khác — `EvaluatorPort`, với `computeMetrics`, `evaluateAndRecord` (tính toán và lưu trữ nguyên tử), và `recordFailed`. Hai bên chưa bao giờ được dung hòa trong khi T12 và T13 được phát triển song song.

`EvaluatorPort` vốn dĩ đã là hợp đồng chính xác: `BacktestService.runSingle` (màn hình chạy đơn lẻ) đã inject trực tiếp nó và hoạt động tốt. Tầng lưu trữ riêng của worker, `ExperimentRepository`, là một bản sao chép từng byte của `EvaluationRepository` — cả hai đều ghi cùng các hàng `Experiment`/`Trade`. Đoạn chú thích của chính `EvaluationRepository` tự gọi mình là "nơi duy nhất module evaluation chạm vào cơ sở dữ liệu", điều mà bản sao chép của worker đã âm thầm vi phạm. Việc `EvaluatorPort` bao gồm `recordFailed` chính là tín hiệu cho thấy module evaluation được thiết kế để sở hữu toàn bộ việc lưu trữ thực nghiệm, chứ không chỉ riêng phần lượt chạy đã hoàn thành.

Vì vậy cách khắc phục là chuyển worker sang nhắm vào `EvaluatorPort`, cùng cách mà luồng chạy đơn lẻ đã làm, và xóa hai file chỉ tồn tại để đi đường vòng qua sự không khớp của port: `RunEvaluator` và `ExperimentRepository`.

## What else we looked at (Các phương án khác đã cân nhắc)

**Một adapter cục bộ triển khai `RunEvaluator` ủy quyền nội bộ cho `EvaluatorPort`** — giữ cho `RunEvaluator` tiếp tục tồn tại như một hình thái thứ hai cho cùng một khái niệm (chấm điểm các giao dịch theo một dataset) và giữ nguyên tầng lưu trữ trùng lặp của `ExperimentRepository`. Điều này sẽ làm biến mất lỗi trước mắt với một diff nhỏ hơn, nhưng nó che đậy sự không khớp thay vì loại bỏ nó, và người tiếp theo chạm vào một trong hai port sẽ vẫn phải bối rối tìm hiểu xem port nào mới là thực sự.

**Giữ lại `ExperimentRepository`, chỉ sử dụng `EvaluatorPort.computeMetrics()` như một hàm thuần túy** — worker sẽ tính toán các chỉ số thông qua bộ tính toán dùng chung nhưng vẫn tự ghi các hàng `Experiment`/`Trade`. Cách này tránh phải mở rộng `EvaluatorPort`, nhưng để lại hai đường dẫn mã độc lập cùng ghi vào một bảng, chính xác là kiểu trùng lặp mà chú thích về quyền sở hữu cơ sở dữ liệu của `EvaluationRepository` được viết ra để loại trừ. Bất kỳ thay đổi nào đối với cách ghi lại một thực nghiệm đã hoàn thành hoặc thất bại đều sẽ phải đưa vào cả hai nơi hoặc bị lệch pha.

## Trade-offs (Đánh đổi)

`EvaluatorPort` có thêm phương thức `isRecorded(datasetId, specHash)` mà trước đây nó không có, hoàn toàn là để bảo toàn tối ưu hóa hiện có của worker: bỏ qua một ứng viên đã được thử nghiệm trước khi chạy mô phỏng backtest của nó — `BacktestService.runSingle` không cần điều này (một lượt chạy tương tác đơn lẻ không bao giờ thử lại ứng viên), do đó port này giờ đây mang theo một phương thức mà chỉ một trong hai đối tượng tiêu thụ sử dụng. Tiến trình worker (`backtest-worker.module.ts`) giờ đây phụ thuộc vào `EvaluationModule`, kéo `PrismaModule` vào lần thứ hai — vô hại vì `PrismaModule` là `@Global()` và worker vốn đã trực tiếp phụ thuộc vào nó, nhưng đó là thêm một module trong đồ thị mà người đọc phải theo dõi. `ExperimentRepository` và `RunEvaluator` bị xóa hoàn toàn thay vì đánh dấu deprecated, dựa trên cơ sở BUG-01 đã chứng minh rằng không có gì phụ thuộc vào trạng thái hoạt động của cả hai.
