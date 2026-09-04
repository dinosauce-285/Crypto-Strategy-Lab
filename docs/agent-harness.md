# Thiết lập Coding Agent Harness

Dự án này lưu giữ các quy chuẩn chung bắt buộc trong git và giữ cho các cơ chế đặc thù của từng công cụ ở môi trường cục bộ (local).
Mục tiêu rất đơn giản: bất kỳ ai clone kho mã nguồn về máy đều có thể yêu cầu AI coding agent của mình đọc tài liệu này, và agent đó sẽ tự thiết lập môi trường (harness) cục bộ chuẩn xác cho runtime của chính nó.

## Câu lệnh khởi tạo mẫu (Bootstrap prompt)

Sử dụng prompt sau khi mới clone dự án về máy:

```text
Hãy đọc AGENTS.md và docs/agent-harness.md. Sau đó kiểm tra các file được các tài liệu đó nhắc đến. Hãy tạo bất kỳ cấu hình agent cục bộ nào bạn cần cho môi trường runtime của mình, nhưng tuyệt đối chỉ lưu trong các thư mục bị bỏ qua (gitignored paths). Hãy bảo toàn các quy tắc dự án, cổng kiểm soát git (git gates), các ràng buộc thư mục và các lệnh kiểm tra xác thực. Không đưa logic nghiệp vụ vào frontend, không bỏ qua yêu cầu tạo ADR, và không bao giờ commit các thông tin bí mật (secrets).
```

## Những gì bắt buộc phải chia sẻ chung (lưu trong Git)

Hợp đồng chia sẻ chung được giữ ở mức tối giản có chủ đích:

- `AGENTS.md` là tệp chỉ dẫn chuẩn mực của toàn dự án.
- `apps/api/docs/BACKEND_CONSTRAINT.md` ràng buộc toàn bộ công việc liên quan đến API.
- `apps/web/docs/UI_CONSTRAINT.md` ràng buộc toàn bộ công việc liên quan đến giao diện Web.
- `docs/decisions/` lưu trữ các bản ghi quyết định kiến trúc (ADR).
- `openspec/` chứa đặc tả tính năng và các thư mục theo dõi thay đổi — xem `0018`. Thư mục này không có `design.md`: một proposal sẽ liên kết với các ADR nền tảng mà nó dựa vào, và việc viết bản ghi ADR mà thay đổi đó đòi hỏi chính là nhóm task 0 trong danh sách nhiệm vụ của nó.
- `.githooks/` chứa các cổng kiểm soát cấp repository mà mọi thành viên đều được kích hoạt khi cài đặt.
- Các lệnh trong `package.json` là bề mặt kiểm tra xác thực chính thức được hỗ trợ.

Mọi thứ khác chỉ là bộ chuyển đổi (adapter) từ các quy chuẩn trên sang tính năng của một agent cụ thể.

## Những gì bắt buộc phải giữ cục bộ (không đưa lên Git)

Các tệp harness cục bộ rất hữu ích, nhưng chúng thuộc về cá nhân và công cụ đang thực thi công việc. Tuyệt đối không đưa chúng vào git:

- Claude Code: `.claude/`, `CLAUDE.md`, các file `CLAUDE.md` con lồng nhau.
- Codex: `.codex/` hoặc trạng thái skill/plugin cục bộ.
- Cursor/Windsurf/các công cụ khác: các thư mục prompt, rule, memory, hook hoặc workflow tương đương.

Nếu agent của bạn cần một file mà thông thường công cụ đó sẽ commit lên git, hãy cứ tạo nó, nhưng bắt buộc phải lưu trong một đường dẫn bị gitignore hoặc trong cấu hình global của máy cá nhân.

Nếu một file harness lỡ bị đưa vào git trước đó, việc chỉ thêm nó vào `.gitignore` là chưa đủ. Hãy xóa nó khỏi index bằng lệnh `git rm --cached` để GitHub không còn nhận file này nữa trong khi file thực tế vẫn còn nguyên vẹn trên đĩa cục bộ.

Trước khi commit, hãy kiểm tra bằng lệnh `git status --short`. Các file runtime của agent cá nhân tuyệt đối không được xuất hiện dưới dạng tệp thêm mới hoặc sửa đổi. Nếu có, hãy chuyển chúng vào đường dẫn được bỏ qua, thêm đường dẫn runtime cục bộ của công cụ vào `.gitignore`, hoặc xóa đường dẫn đã theo dõi khỏi index bằng `git rm --cached`.

## Hành vi bắt buộc của Agent Harness

Khi một agent tạo harness cục bộ, nó bắt buộc phải duy trì các hành vi sau:

### Khi khởi động (Startup)

- Luôn đọc `AGENTS.md` trước tiên.
- Đối chiếu tác vụ hiện tại với `docs/project-breakdown.html` khi có mã định danh task ID.
- Đưa ra các quyết định còn đang mở từ `docs/decisions-to-lock.html` trước khi bắt tay viết code cho một quyết định chưa được chốt.
- Kiểm tra ranh giới biến môi trường: các secret của server phải nằm trong `apps/api/.env`; mọi biến môi trường cho trình duyệt trong `apps/web/.env` bắt buộc phải có tiền tố `VITE_`.

### Trước khi chỉnh sửa code (Before editing)

- Đọc tài liệu ràng buộc thư mục gần nhất trước khi sửa code trong `apps/api` hoặc `apps/web`.
- Khảo sát các module lân cận và tuân thủ đúng cấu trúc, phong cách code hiện có.
- Quyết định xem thay đổi có cần viết một tệp ADR hay không trước khi bắt tay vào viết code.
- Từ chối đọc các tệp sinh tự động/thư viện ngoài trừ khi thực sự cần thiết để debug:
  `node_modules/`, `dist/`, `build/`, kết quả đo lường coverage và Prisma client được sinh tự động.

### Trong quá trình viết code (While editing)

- Tách biệt tuyệt đối logic chiến lược khỏi các lệnh gọi sàn, truy cập cơ sở dữ liệu, mã giao diện frontend và phát thông báo.
- Giữ các phép tính toán nghiệp vụ hoàn toàn nằm ngoài React.
- Ưu tiên các file nhỏ gọn, tập trung vào một nhiệm vụ, đặt tên file theo chuẩn `kebab-case` và tuân thủ các pattern sẵn có của repo.
- Tránh dùng `as any`, `@ts-ignore`, comment trần thuật dông dài và các mock giả lập chỉ làm che giấu lỗi thực tế.

### Xác thực và kiểm thử (Verification)

- Chạy các lệnh kiểm tra trong phạm vi package hẹp trong lúc đang phát triển.
- Trước khi tuyên bố hoàn thành, bắt buộc phải chạy `pnpm lint` và `pnpm build`.
- Đối với công việc UI, hãy mở màn hình và kiểm tra đầy đủ các trạng thái: loading (đang tải), empty (trống rỗng), error (lỗi) và populated (đã có dữ liệu).
- Đối với công việc API, gọi endpoint hoặc kiểm thử service thông qua một script cục bộ hoặc lệnh terminal.

### Git và an toàn (Git and safety)

- Dùng `pnpm commit` thay vì gọi trực tiếp `git commit`.
- Tuyệt đối không stage các file env plaintext, private keys, thông tin đăng nhập hoặc file `.mcp.json`.
- Không vượt mặt (bypass) `.githooks/` trừ khi người dùng đã chấp nhận sự đánh đổi một cách tường minh.
- Nếu một contract chung bị thay đổi, bắt buộc phải kèm theo một bản ghi quyết định kiến trúc trong `docs/decisions/`.

## Các năng lực cục bộ tùy chọn (Optional local capabilities)

Agent nên ánh xạ các năng lực sau vào tính năng sẵn có của mình nếu được hỗ trợ:

- Nhắc nhở lúc khởi động về các quyết định còn mở và sự sai lệch biến môi trường.
- Một pre-tool guard ngăn chặn truy cập vào các đường dẫn chứa secret và các file sinh tự động/vendor.
- Trình tự động format sau khi sửa cho các file mà agent đã chỉnh sửa.
- Nhắc nhở tạo ADR sau khi thay đổi contracts, Prisma schema hoặc cách kết nối các module.
- Một nhóm nhỏ các subagent hoặc mode cục bộ cho việc lập kế hoạch, code review, debugging và kiểm tra bảo mật.
- Một công cụ hỗ trợ thiết kế frontend được nạp trước khi thao tác với màn hình, component, design token, bố cục hoặc biểu đồ.
- Một công cụ hỗ trợ chiến lược được nạp khi bổ sung một chiến lược giao dịch mới.

Tất cả những thứ này chỉ là adapter, không phải là luật mới của dự án. Nếu có bất kỳ xung đột nào giữa adapter và `AGENTS.md`, thì quy tắc trong `AGENTS.md` luôn luôn thắng.

## Checklist khi mới clone dự án về máy

1. Cài đặt các gói phụ thuộc bằng `pnpm install`.
2. Để lệnh `prepare` tự động kích hoạt `.githooks/`.
3. Sinh các file runtime bằng lệnh `pnpm db:generate` khi đã có cấu hình env cho API.
4. Yêu cầu AI coding agent của bạn chạy bootstrap prompt ở đầu tài liệu.
5. Giữ harness vừa tạo ở phạm vi cục bộ; chỉ commit các file dự án dùng chung.

## Thiết lập OpenSpec cho từng máy

Thư mục `openspec/` được lưu trong git nhưng các skill mà nó sinh ra thì không, vì chúng rơi vào đường dẫn harness bị gitignore. Do đó mỗi thành viên sẽ chạy lệnh này một lần duy nhất trên máy:

```bash
pnpm exec openspec init --tools <your-tool>
pnpm exec openspec config set telemetry.enabled false
```

Thu thập dữ liệu từ xa (telemetry) được bật mặc định và cấu hình được lưu tại `~/.config/openspec` (nằm ngoài repo), vì vậy việc tắt nó là thao tác cho từng máy thay vì một lần cho toàn bộ nhóm.

Nếu harness của bạn kiểm tra tính hợp lệ của YAML frontmatter trong skill, hãy nới rộng bộ kiểm tra: OpenSpec ghi một khối `metadata:` lồng nhau, khiến cho các parser chỉ chấp nhận cấu trúc phẳng `key: value` báo lỗi.
