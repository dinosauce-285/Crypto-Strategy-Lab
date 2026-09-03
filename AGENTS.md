# AGENTS.md — Crypto Strategy Lab

Quy chuẩn và chỉ dẫn chung cho bất kỳ AI coding agent nào (Claude, Codex, Cursor, Windsurf...).
Đây là nguồn sự thật chuẩn mực (canonical source of truth). Mọi cấu hình công cụ chuyên biệt chỉ mang tính cục bộ và không được theo dõi trong git.
Khi mới clone dự án về máy, hãy yêu cầu agent đọc `docs/agent-harness.md` để tự thiết lập môi trường (harness) cục bộ phù hợp với công cụ đó.

## Bản chất của dự án (What this project is)

Một phòng thí nghiệm (laboratory) kết hợp các chiến lược giao dịch tiền mã hóa: cắm ghép các phương pháp phân tích, tự động kết hợp chúng, kiểm thử lịch sử (backtest) từng tổ hợp, tính điểm đánh giá, xếp hạng và lặp lại tìm kiếm.

**Trọng tâm chấm điểm là kiến trúc phần mềm, không phải mức lợi nhuận đạt được.** Thước đo chất lượng là số lượng vị trí phải chỉnh sửa khi bổ sung một chiến lược mới, một thuật toán tìm kiếm mới hoặc một sàn giao dịch mới. Thêm 1 file mới = Tốt. Chỉnh sửa 6 vị trí rải rác trên hệ thống = Kém.

Bản phân rã chi tiết đề bài: `docs/project-breakdown.html` (29 nhiệm vụ / 6 vertical slice).
Các quyết định mở cần chốt: `docs/decisions-to-lock.html`.

## Ngăn xếp công nghệ (Stack)

TypeScript toàn diện từ đầu đến cuối (end to end). NestJS cho API, React + Vite cho giao diện Web, cùng một package kiểu dữ liệu dùng chung (`packages/contracts`) được cả hai phía import. Cơ sở dữ liệu PostgreSQL quản lý qua Prisma 7. Bus sự kiện nội tiến trình (in-process event bus) cho việc phát thông báo, hàng đợi BullMQ trên Redis cho các tác vụ nặng. Phân loại cảm xúc tin tức qua mô hình host trên Groq đứng sau một interface provider.

Mỗi lựa chọn kỹ thuật trên đều có một bản ghi quyết định tương ứng trong `docs/decisions/` giải thích rõ cái giá phải trả và lý do lựa chọn.

```
apps/api            NestJS — kiến trúc được thể hiện qua các module
apps/web            React + Vite — chỉ render hiển thị, tuyệt đối không tính toán logic
packages/contracts  chứa kiểu dữ liệu chung (shared types), được cả hai phía import
```

Hai thư mục con có tài liệu ràng buộc bắt buộc riêng, có mức ưu tiên cao nhất bên trong phạm vi thư mục đó:
`apps/api/docs/BACKEND_CONSTRAINT.md` và `apps/web/docs/UI_CONSTRAINT.md`.

## Sơ đồ Kiến trúc (Architecture)

```
Frontend  ──API/WebSocket──►  Backend
                                 ├── Market Data Service ──► Exchange Adapter ──► Binance
                                 ├── Strategy Service ──► Registry ──► Combination ──► Backtester ──► Evaluator ──► Leaderboard
                                 └── News Service ──► Providers ──► Sentiment Service
```

Chiều phụ thuộc đi một chiều duy nhất, từ trái sang phải. Tuyệt đối không có thành phần phía sau nào import ngược lại thành phần phía trước.

## Các quy tắc bất khả xâm phạm (Iron Rules)

1. **Mọi quyết định kiến trúc đều phải có một tệp ADR trước khi merge mã nguồn.** Xem mục *Bản ghi quyết định* bên dưới. Một quyết định chỉ bàn qua chat mà không được viết thành văn bản thì xem như không tồn tại — báo cáo kiến trúc là phần được chấm điểm.
2. Một chiến lược chỉ chứa duy nhất logic giao dịch. Không gọi trực tiếp API sàn, không truy vấn database, không chứa mã vẽ biểu đồ, không gửi notification bên trong chiến lược.
3. Thêm một chiến lược = Thêm 1 file mới + Đăng ký 1 dòng. Nếu một thay đổi đòi hỏi nhiều hơn mức này, kiến trúc registry đang có vấn đề — hãy sửa lại registry, không sửa bên gọi.
4. Tách biệt hoàn toàn việc đánh giá (evaluation) khỏi cài đặt thực thi (implementation). Chiến lược chỉ phát tín hiệu (signal); tuyệt đối không tự tính toán lợi nhuận của chính mình.
5. Logic nghiệp vụ không bao giờ được đặt ở frontend. Không tính toán toán học chiến lược, không chạy backtest, không tính toán lợi nhuận hay xếp hạng bên trong React.
6. Frontend không bao giờ gọi trực tiếp đến sàn giao dịch, và không bao giờ polling hỏi giá liên tục — server sẽ chủ động đẩy dữ liệu qua push stream.
7. Một lượt backtest tuyệt đối không được đọc dữ liệu tương lai vượt quá cây nến hiện tại đang xét, và khi chạy lại trên cùng tập dữ liệu phải cho ra kết quả y hệt nhau.
8. Không có vòng lặp vô tận (unbounded loops). Vòng lặp tìm kiếm bắt buộc phải có điều kiện dừng tường minh (giới hạn ứng viên, thời gian).
9. Sử dụng Conventional Commits, phạm vi (scope) = tên module. Vượt qua toàn bộ kiểm tra chất lượng (quality gates) trước khi commit.

## Những điều bị nghiêm cấm (Mất điểm đồ án — theo mục 44 đề bài)

| Anti-pattern | Biểu hiện vi phạm |
| --- | --- |
| **God Service** | Một service ôm đồm tất cả: vừa lấy dữ liệu, vừa tính indicator, vừa crawl tin tức, vừa chạy ML, vừa backtest, vừa xếp hạng và vừa push WebSocket |
| **Hard-coded strategy** | Viết cứng điều kiện: `if MA && RSI … else if MA && Bollinger …` |
| **Logic in the frontend** | Đưa logic vào React để tính toán lợi nhuận, xếp hạng hoặc sinh tín hiệu |
| **Strategy touching the DB** | `RSIStrategy` tự ý mở kết nối trực tiếp đến database |
| **Crawler welded to ML** | Module crawl tin tức gọi thẳng vào model phân loại cảm xúc mà không qua tầng phân tách |

## Bản ghi quyết định kiến trúc (Decision records)

Vị trí lưu trữ: `docs/decisions/`. Mỗi quyết định một tệp tin.

**Bắt buộc phải viết một bản ghi khi thay đổi thực hiện bất kỳ điều nào sau đây:**

- Giới thiệu mới hoặc sửa đổi một shared type, interface hoặc event contract.
- Thay đổi cấu trúc cơ sở dữ liệu (database schema).
- Thay đổi cách các module giao tiếp với nhau (gọi trực tiếp ↔ phát event ↔ đẩy hàng đợi queue).
- Thêm mới một thư viện phụ thuộc (dependency), một service hoặc một thành phần hạ tầng.
- Thay đổi quy tắc backtest hoặc công thức tính điểm (giá vào lệnh, phí giao dịch, công thức sụt giảm tài khoản drawdown).
- Chốt một trong các quyết định còn mở liệt kê tại `docs/decisions-to-lock.html`.

**Mỗi bản ghi trả lời duy nhất ba câu hỏi cốt lõi:**

1. **Why we chose this (Tại sao chọn phương án này)** — Lý do đưa ra quyết định, và phục vụ yêu cầu nào của đề bài.
2. **What else we looked at (Các phương án khác đã cân nhắc)** — Những lựa chọn thực tế khác và lý do chúng bị loại bỏ. Phải bao gồm cả phương án mà người đọc tự nhiên sẽ nghĩ đến; nếu bỏ qua sẽ tạo cảm giác nhóm chưa từng nghĩ tới.
3. **Trade-offs (Đánh đổi)** — Những gì phải đánh đổi khi chọn phương án này. Bất kỳ quyết định thực tế nào cũng có cái giá của nó; một bản ghi không nêu phần này là chưa được cân nhắc thấu đáo.

Bắt đầu từ tệp mẫu `docs/decisions/0000-template.md`.

## Quy trình làm việc (Workflow)

Công việc được chia thành các **lát cắt dọc (vertical slices)**, không chia theo tầng kỹ thuật. Mỗi slice kết thúc bằng một tính năng thực tế có thể thao tác/bấm được trên giao diện. Không bắt đầu slice tiếp theo cho đến khi slice hiện tại hoàn tất.

```
Slice 0 Nền tảng → 1 Biểu đồ Realtime → 2 Chạy một chiến lược
       → 3 Tìm kiếm tổ hợp → 4 Tin tức & Sentiment → 5 Bàn giao & Báo cáo
```

Trong cùng một slice, các task backend có thể chạy song song; task đóng lại slice thường là task hoàn thiện màn hình giao diện tương ứng. Mã công việc (`T01`…`T29`) khớp với `docs/project-breakdown.html` và bảng Trello, đồng thời được dùng làm scope cho nhánh và commit.

## Tiêu chuẩn trình bày tài liệu

Mọi tài liệu phải tập trung ghi lại **lập luận và lý do kỹ thuật (reasoning)**, không sa đà vào thủ tục hành chính. Áp dụng chung cho cả ADR, tài liệu kiến trúc, README và toàn bộ tài liệu khác:

- Không đưa vào các trường trạng thái, người phụ trách, ngày tháng, mã ticket hay thủ tục duyệt rườm rà trừ khi có người thực sự đọc. Chúng lỗi thời rất nhanh và không ai kiểm tra lại.
- Không giải thích lại cấu trúc thư mục hay dàn ý của tài liệu. Hãy đi thẳng vào nội dung chính. Người đọc muốn xem cấu trúc có thể tự nhìn vào cây thư mục.
- Nêu rõ cái giá phải trả (đánh đổi), không chỉ ca ngợi lợi ích đạt được. Tài liệu không nêu chi phí sẽ giống văn phong quảng cáo và bị đánh giá thấp.
- Sử dụng câu văn gãy gọn thay vì các bảng metadata hình thức. Chỉ dùng bảng khi so sánh đối chiếu các lựa chọn.
- Càng ngắn gọn súc tích càng tốt, nhưng tuyệt đối không được đánh đổi lý do "tại sao" (*why*). Lược bỏ phần rườm rà, giữ lại lập luận cốt lõi.

## Thiết lập Agent Harness

Kho lưu trữ chỉ commit quy tắc chung của dự án, không commit file cấu hình máy ảo riêng của từng bên. Các cấu hình cho Claude, Codex, Cursor, Windsurf hoặc các công cụ khác phải được sinh cục bộ từ cùng một nguồn:

1. Đọc tệp này (`AGENTS.md`) trước tiên.
2. Đọc `docs/agent-harness.md` để nắm cấu trúc harness bắt buộc.
3. Đọc các tài liệu ràng buộc chuyên biệt trước khi thao tác trong thư mục tương ứng:
   `apps/api/docs/BACKEND_CONSTRAINT.md` và `apps/web/docs/UI_CONSTRAINT.md`.
4. Chỉ tạo các file cấu hình công cụ trong các đường dẫn đã được gitignore, ví dụ `.claude/`, `.codex/`, `.cursor/` hoặc thư mục tương đương của agent đó.

Harness cục bộ có thể thêm hooks, subagents, memories, skills hoặc file prompt riêng, nhưng tuyệt đối không được thay đổi các quy tắc cốt lõi này hoặc làm suy yếu các chốt kiểm soát trong `.githooks/`.
Trước khi commit, mỗi thành viên phải xác nhận các file runtime của agent cá nhân đã được gitignore và không bị theo dõi. Nếu một file harness cá nhân xuất hiện trong `git status`, phải dừng lại và chuyển nó vào đường dẫn bị bỏ qua hoặc xóa khỏi index bằng lệnh `git rm --cached`.

## Kỷ luật phát triển mã nguồn (Development discipline)

Chi tiết được mô tả trong `docs/agent-harness.md`. Tóm tắt các nguyên tắc:

- YAGNI / KISS / DRY — ba dòng code tương tự nhau vẫn tốt hơn một abstraction vội vàng, gượng ép.
- Giới hạn ~200 dòng mỗi file — chia nhỏ thành các module rõ trách nhiệm, không để file phình to.
- Không viết comment trần thuật kể lể — lý do "tại sao sửa dòng này" thuộc về nội dung commit message.
- Không dùng mock giả lập che giấu lỗi thất bại thực tế.
- Quy chuẩn đặt tên: `kebab-case` cho tên file, `PascalCase` cho types và React components.
- Mọi nhận xét phản biện hoặc ghi chú review phải kèm dẫn chứng vị trí `file:line` cụ thể.

## Các câu lệnh chính (Commands)

```bash
pnpm dev          API chạy cổng :3001, web chạy cổng :5173
pnpm worker       Một backtest worker — tiến trình độc lập, ADR 0004. Có thể bật nhiều worker tùy ý
pnpm build        Build contracts, sau đó đến api, rồi đến web
pnpm lint         Kiểm tra lint cả hai ứng dụng kèm kiểm tra token giao diện
pnpm commit       Tạo commit chuẩn Conventional Commits — dùng lệnh này, không dùng git commit trực tiếp
pnpm db:generate  Sinh lại mã nguồn Prisma client sau khi cập nhật schema
```

Postgres chạy trong container local `ai_erp_db` trên cổng 5432, với database riêng biệt `crypto_strategy_lab`. Chỉ dùng chung tiến trình máy chủ server, không chia sẻ bảng với dự án khác. Redis chạy trong container local `redis` trên cổng 6379 và phụ trách hàng đợi backtest. Nếu không có Redis, API vẫn khởi động được và các màn hình khác vẫn dùng bình thường; khi bắt đầu một search run hệ thống sẽ phản hồi lỗi 503 thay vì bị treo, giúp phân biệt rõ ràng giữa dịch vụ thiếu và lỗi logic chương trình.

## Biến môi trường (Environment)

**Mỗi ứng dụng có một file `.env` riêng biệt.** `apps/api/.env` chứa các bí mật máy chủ; `apps/web/.env` chứa các giá trị dành cho trình duyệt. Không có file `.env` ở thư mục gốc workspace.

Sự tách biệt này bắt buộc vì Vite sẽ nhúng thẳng mọi biến môi trường mà nó nạp vào gói bundle gửi cho người dùng. Do đó đây là một ranh giới bảo mật nghiêm ngặt:

- `apps/api/.env` — `DATABASE_URL`, `GROQ_API_KEY`, các URL kết nối sàn. Tuyệt đối không bao giờ rời khỏi server.
- `apps/web/.env` — **Chỉ các biến có tiền tố `VITE_`**, và mọi thứ trong file này đều là công khai. Bất kỳ API key, secret token, password hay chuỗi kết nối database nào đặt vào file này đều sẽ bị lộ ngay trong lần build tiếp theo.

Hook kiểm tra khi bắt đầu phiên làm việc sẽ thực thi ranh giới này: cảnh báo bất kỳ biến nào không có tiền tố `VITE_` trong file env của web, và báo cáo nếu `.env` của bất kỳ ứng dụng nào bị lệch so với `.env.example`.

Chỉ các file `.env.example` mới được commit lên git. Cả hai file cấu hình thực tế dạng plaintext đều nằm trong gitignore.

**File env của API được commit dưới dạng mã hóa.** `apps/api/.env` được mã hóa bằng công cụ `age` thành `envs/api.env.age` và file này *được* lưu trong git. Khóa bí mật `.env.key` không bao giờ đưa lên git — đồng đội sẽ chuyển giao một lần duy nhất qua kênh bảo mật.

```bash
pnpm env:decrypt    # sau khi clone dự án, hoặc khi có thành viên cập nhật giá trị mới
pnpm env:encrypt    # sau khi chỉnh sửa một giá trị, trước khi thực hiện commit
```

Mục đích không phải để cho gọn gàng. Nếu không làm cách này, cách thức các thành viên chia sẻ key thực tế sẽ là dán qua tin nhắn chat — và đó là cách các thông tin mật bị rò rỉ vĩnh viễn. Tệp `apps/web/.env` không cần mã hóa vì mọi giá trị trong đó đằng nào cũng được gửi thẳng tới trình duyệt người dùng; không có gì cần phải giấu.
