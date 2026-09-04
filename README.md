# Crypto Strategy Lab

Nền tảng kết hợp các chiến lược giao dịch tiền mã hóa (crypto), kiểm thử lịch sử (backtest) từng tổ hợp, tính điểm đánh giá và xếp hạng kết quả — sau đó lặp lại tìm kiếm để phát hiện các cấu hình tối ưu hơn.

Trọng tâm chấm điểm của đồ án là **kiến trúc phần mềm**, không phải mức lợi nhuận đạt được. Thước đo chất lượng kiến trúc là số lượng vị trí phải chỉnh sửa khi có thêm một chiến lược mới, một thuật toán tìm kiếm mới hoặc một sàn giao dịch mới được tích hợp. Thêm một file mới duy nhất là tốt. Chỉnh sửa sáu vị trí rải rác trên toàn hệ thống là chưa đạt.

Tài liệu chuẩn mực: [`AGENTS.md`](AGENTS.md) là quy tắc cốt lõi của dự án. [`docs/architecture.md`](docs/architecture.md) mô tả cách các thành phần khớp nối với nhau. [`docs/decisions/`](docs/decisions/) ghi nhận lý do và bối cảnh cho từng lựa chọn kỹ thuật.

## Cài đặt (Install)

Yêu cầu môi trường: **Node 22+** và **pnpm 11+**. Hai container phải đang chạy — **Postgres** trên cổng 5432 và **Redis** trên cổng 6379. Ở môi trường local, có thể dùng các container `ai_erp_db` và `redis` đã chạy sẵn; dự án này sử dụng database riêng bên trong container Postgres và instance mặc định của Redis.

```bash
docker exec ai_erp_db psql -U postgres -c "CREATE DATABASE crypto_strategy_lab;"

cp apps/web/.env.example apps/web/.env
pnpm env:decrypt          # cần file .env.key từ thành viên nhóm; giải mã ra apps/api/.env

pnpm install
pnpm db:generate
```

Tệp `apps/api/.env` được commit dưới dạng **mã hóa** tại `envs/api.env.age`. Khóa bí mật `.env.key` tuyệt đối **không** được commit — được chia sẻ qua kênh nội bộ giữa các thành viên. Hãy cài đặt công cụ `age` trước (`sudo apt install age` hoặc tải binary từ trang phát hành của age).

Dự án phân chia hai file `.env`, một cho mỗi ứng dụng, và sự phân chia này là ranh giới bảo mật: Vite sẽ đóng gói trực tiếp mọi biến môi trường được nạp vào bundle gửi đến client, do đó `apps/web/.env` chỉ chứa các biến công khai có tiền tố `VITE_`, còn tất cả bí mật (secrets) chỉ lưu ở phía server. Xem thêm mục *Environment* trong [`AGENTS.md`](AGENTS.md).

Prisma 7 sinh mã client vào `apps/api/src/generated/` (được đưa vào gitignore), vì vậy lệnh `pnpm db:generate` cần chạy một lần sau khi clone dự án và chạy lại sau mỗi lần thay đổi schema database.

## Khởi chạy (Run)

Chạy hai lệnh sau trên hai terminal riêng biệt:

```bash
pnpm dev        # API chạy tại cổng :3001, web chạy tại :5173
pnpm worker     # Backtest worker — có thể bật bao nhiêu worker tùy ý
```

Mở trình duyệt tại http://localhost:5173. Ứng dụng gồm năm màn hình:

| Màn hình | Chức năng |
| --- | --- |
| **Realtime** | Bốn biểu đồ trực tiếp của một cặp giao dịch trên 4 khung thời gian, kèm bảng khớp lệnh tức thời (trade tape) |
| **Backtest** | Chọn một dataset và một chiến lược, thực hiện một lượt backtest đơn lẻ, hiển thị các điểm vào lệnh (trades) trực tiếp trên chart |
| **Search** | Khởi chạy một tiến trình tìm kiếm chiến lược có giới hạn (bounded search run), theo dõi tiến độ, tạm dừng hoặc dừng hẳn |
| **Leaderboard** | Bảng xếp hạng tất cả các thử nghiệm (experiments) đã hoàn thành cho một dataset |
| **News** | Danh sách tin tức thu thập được và tỷ lệ phân loại cảm xúc (sentiment) |

Nếu không có Redis, API vẫn khởi động bình thường và các màn hình khác vẫn hoạt động — khi bấm bắt đầu một search run, hệ thống sẽ trả về mã lỗi 503 thay vì bị treo vô thời hạn, phân biệt rõ giữa một dịch vụ chưa bật và một hệ thống bị lỗi code.

Worker được tách thành một tiến trình độc lập có chủ đích: tác vụ backtest ngốn nhiều tài nguyên CPU (CPU-bound), nếu chạy chung trong tiến trình API sẽ làm nghẽn chính kết nối WebSocket dùng để đẩy tiến độ về cho giao diện ([ADR 0004](docs/decisions/0004-bullmq-for-backtests.md)).

## Kiến trúc tổng thể (Architecture)

Ba tiến trình chạy trên một kho mã nguồn duy nhất (monorepo), cùng một package chia sẻ kiểu dữ liệu chung mà không bên nào độc quyền:

```
apps/web            React + Vite — chỉ render hiển thị, không xử lý logic tính toán
apps/api            NestJS — module hóa thể hiện kiến trúc hệ thống
apps/api (worker)   dùng chung codebase, khởi động từ BacktestWorkerModule, không mở cổng HTTP
packages/contracts  chứa các kiểu dữ liệu dùng chung (shared types), được cả web và api import
```

Luồng dữ liệu di chuyển một chiều: sàn giao dịch (exchange) → dữ liệu thị trường (market) → chỉ báo (indicator) → chiến lược (strategy) → kiểm thử lịch sử (backtest) → đánh giá (evaluation) → xếp hạng (ranking) → màn hình (screen). Không có thành phần phía sau nào được gọi ngược về phía trước. Một chiến lược chỉ chứa duy nhất logic giao dịch — không gọi trực tiếp API sàn, không truy cập database, không render chart — nhờ đó việc thêm một chiến lược mới chỉ đơn giản là thêm một file và đăng ký một dòng trong `registered-strategies.ts`.

Các module không bao giờ gọi trực tiếp nhau để phát thông báo. Hệ thống định nghĩa chín sự kiện nội bộ để thực hiện việc này, và trình duyệt được kết nối thông qua một kênh Socket.IO duy nhất phân định theo chủ đề (topic), giúp màn hình dù đang theo dõi 4 biểu đồ cùng lúc vẫn chỉ duy trì duy nhất một kết nối mạng.

Tài liệu kiến trúc chi tiết toàn diện — bao gồm ngữ cảnh hệ thống (system context), phân rã module, trách nhiệm thành phần, và các luồng dữ liệu, realtime, strategy, search — được trình bày tại [`docs/architecture.md`](docs/architecture.md).

## Kịch bản Demo (Demo)

Trình tự trải nghiệm ứng dụng theo các yêu cầu của đề bài:

1. **Realtime** — mở cặp BTCUSDT, quan sát 4 khung thời gian cùng cập nhật trực tiếp và bảng khớp lệnh liên tục nhận dữ liệu.
2. **Backtest** — chọn một bộ dataset, chọn một chiến lược cùng các tham số tương ứng, bấm chạy. Các điểm vào lệnh (trades) được vẽ trực tiếp lên biểu đồ và panel chỉ số hiệu suất được tính toán đầy đủ.
3. **Search** — chọn các chiến lược cho phép tham gia tìm kiếm, đặt giới hạn số lượng ứng viên/thời gian, bắt đầu chạy. Tiến độ hiển thị số ứng viên đã thử, độ sâu hàng đợi, số lỗi, thời gian backtest trung bình và chiến lược dẫn đầu hiện tại.
4. **Leaderboard** — xem kết quả xếp hạng các chiến lược cho dataset. Bấm vào một kết quả để kiểm tra chi tiết các giao dịch.
5. **News** — thu thập bài báo tin tức, quan sát tỷ lệ tâm lý tích cực/tiêu cực/trung tính và cách dữ liệu này được đưa vào chiến lược tin tức.

## Các câu lệnh (Scripts)

| Câu lệnh | Chức năng |
| --- | --- |
| `pnpm dev` | Chạy đồng thời API và Web với log phân biệt màu sắc |
| `pnpm dev:api` · `pnpm dev:web` | Khởi chạy riêng rẽ từng phía API hoặc Web |
| `pnpm worker` | Khởi chạy một tiến trình backtest worker |
| `pnpm build` | Build lần lượt contracts, sau đó đến API, rồi đến Web |
| `pnpm lint` | Kiểm tra quy chuẩn mã nguồn toàn workspace kèm kiểm tra UI token |
| `pnpm quality` | Chạy lint + build — cổng kiểm tra tự động chạy bởi git hooks |
| `pnpm db:generate` | Sinh lại mã nguồn Prisma client |
| `pnpm db:migrate` · `pnpm db:studio` | Quản lý migration Prisma và mở giao diện trực quan Prisma Studio |
| `pnpm commit` | Công cụ hướng dẫn viết commit chuẩn Conventional Commits — khuyến nghị dùng thay cho `git commit` |
| `pnpm decision "<the choice>"` | Khởi tạo nhanh một tệp quyết định kiến trúc (ADR) |
| `pnpm env:encrypt` · `pnpm env:decrypt` | Mã hóa và giải mã file môi trường API bằng công cụ age |

## Đóng góp mã nguồn (Contributing)

Mỗi nhánh (branch) ứng với một tác vụ, được đặt tên theo mã ID trong [`docs/project-breakdown.html`](docs/project-breakdown.html): ví dụ `T11-strategy-registry`. Thực hiện commit bằng lệnh `pnpm commit` — lệnh này sẽ tạo commit message theo chuẩn conventional và tự động lấy scope từ tên nhánh, ví dụ nhánh trên sẽ sinh message dạng `feat(strategy-registry): …`.

Bất kỳ thay đổi nào làm thay đổi contract dữ liệu chung, schema database, cách thức giao tiếp giữa các module hoặc công thức tính điểm kiểm thử bắt buộc phải tạo một bản ghi quyết định kiến trúc trong thư mục [`docs/decisions/`](docs/decisions/) ngay trong commit đó. Hook pre-push của git sẽ từ chối lệnh push nếu thiếu bản ghi này, bởi vì một quyết định chỉ bàn luận qua chat mà không được ghi lại thì coi như không tồn tại.

Chỉ dẫn dành cho AI coding agent: [`AGENTS.md`](AGENTS.md) là quy tắc chung bắt buộc, và [`docs/agent-harness.md`](docs/agent-harness.md) hướng dẫn cách các agent như Claude, Codex, Cursor, Windsurf tự thiết lập môi trường (harness) cục bộ phù hợp. Mọi file cấu hình đặc thù của từng công cụ phải được lưu ở các thư mục gitignored; chỉ những file được commit mới là hợp đồng chuẩn mực của dự án.
