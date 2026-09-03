# Ràng buộc Kiến trúc Backend — apps/api

Quy chuẩn bắt buộc áp dụng cho mọi tệp tin trong thư mục `src/`. Tệp `AGENTS.md` ở thư mục gốc có mức ưu tiên cao nhất về các vấn đề toàn dự án (đường dẫn, câu lệnh, luồng phân nhánh git); tệp này có mức ưu tiên cao nhất về phân tầng module và truy cập cơ sở dữ liệu. Nếu hai tài liệu có điểm không thống nhất, hãy chỉnh sửa tài liệu chưa đúng để toàn dự án có duy nhất một chuẩn.

Phần lớn các quy tắc này được đúc kết từ các dự án NestJS môi trường production thực tế. Những quy tắc mang tính đặc thù riêng đã được lược bỏ; những gì còn lại là các nguyên tắc cốt lõi áp dụng bền vững qua mọi hệ thống.

## Các quy tắc không thể thương lượng (Non-negotiable)

- **Các Service tuyệt đối không bao giờ chạm trực tiếp vào `PrismaService`.** Mọi truy cập cơ sở dữ liệu, bao gồm cả `$queryRaw`, bắt buộc phải nằm trong tệp `*.repository.ts` của module đó. Một service nắm giữ phụ thuộc vào `PrismaService` sẽ bị gắn chặt (tightly coupled) vào tầng lưu trữ, và điều đó phá vỡ hoàn toàn ý nghĩa của việc tách tầng.
- **Các Repository tuyệt đối không bao giờ inject Service.** Một repository chỉ nhận `PrismaService` và các hàm thuần túy (pure helpers), ngoài ra không nhận thêm gì khác. Chiều phân tầng chỉ đi theo một hướng duy nhất.
- **Không inject trực tiếp lớp cài đặt cụ thể giữa các module (No concrete cross-module injection).** Module A sử dụng module B bắt buộc phải inject qua một abstract class hoặc một injection token, tuyệt đối không inject trực tiếp lớp cụ thể `XxxService`. Không bao giờ export một repository ra bên ngoài module của chính nó.
- **Các phương thức public của service phải trả về DTO, không trả về các dòng dữ liệu thô của Prisma,** và phải khai báo kiểu trả về tường minh `Promise<XxxResponseDto>`. Các kiểu dữ liệu giao tiếp nằm trong `dto/`, hoặc nằm trong `@csl/contracts` khi phía frontend cũng cần dùng đến.
- **Tuyệt đối không dùng `as any` trên kết quả trả về của Prisma.** Thay vào đó, hãy bổ sung trường tương ứng vào mệnh đề `select`.
- **Không viết comment trần thuật kể lể (No narration comments).** Không viết comment nội dòng hay JSDoc chỉ để lặp lại những gì tên hàm/biến đã thể hiện, và không viết ghi chú "lý do tôi sửa dòng này" — nội dung đó thuộc về commit message hoặc bản ghi quyết định kiến trúc (ADR). Chỉ giữ lại comment đối với các điều kiện bất biến (invariant) mà người đọc không thể tự suy luận ra từ code, và giới hạn trong một dòng.

## Cấu trúc chuẩn của một Module (Module shape)

```
src/<domain>/
  <domain>.module.ts        khai báo dây nối (wiring); công bố những gì module export ra ngoài
  <domain>.controller.ts    chỉ xử lý HTTP — không chứa logic nghiệp vụ, không chạm database
  <domain>.service.ts       chứa logic nghiệp vụ thuần túy; hoàn toàn không phụ thuộc Prisma
  <domain>.repository.ts    vị trí duy nhất được phép tương tác với cơ sở dữ liệu
  dto/                      định nghĩa cấu trúc dữ liệu request và response
  ports/                    các interface mà module này cần từ các module khác
```

Một module chỉ export bề mặt tối thiểu mà các bên tiêu thụ thực sự cần. Bất kỳ thành phần nào không được export sẽ mặc định là private — đó là cách NestJS tự động thực thi quy tắc kiểm soát phụ thuộc cho bạn, và đó cũng là lý do NestJS được chọn thay vì Express (xem `docs/decisions/0001-typescript-nest-react.md`).

## Các quy tắc nghiệp vụ của dự án (Domain rules)

Các quy tắc này bắt nguồn trực tiếp từ đề bài đồ án và sẽ bị trừ điểm nếu vi phạm:

- **Một chiến lược chỉ chứa duy nhất logic giao dịch.** Không gọi trực tiếp API sàn, không truy vấn database, không chứa mã biểu đồ, không gửi thông báo bên trong chiến lược. Nó nhận mọi dữ liệu cần thiết thông qua đối tượng context được cấp.
- **Một chiến lược không bao giờ chạm vào cơ sở dữ liệu.** Nếu chiến lược cần chỉ báo kỹ thuật hay dữ liệu tâm lý thị trường, những thứ đó phải được cung cấp qua context gateway, không phải qua một repository được inject vào.
- **Tách biệt hoàn toàn việc đánh giá khỏi cài đặt thực thi.** Một chiến lược chỉ phát ra tín hiệu (signals); việc tính toán lợi nhuận, tỷ lệ thắng hay mức sụt giảm tài khoản drawdown diễn ra ở module khác và không bao giờ nằm trong chiến lược.
- **Thêm một chiến lược mới chỉ là một file duy nhất cộng với một dòng đăng ký.** Nếu đòi hỏi nhiều hơn mức này, cấu trúc registry đang có vấn đề. Hãy sửa lại registry.
- **Một lượt backtest tuyệt đối không được đọc cây nến nằm sau cây nến nó đang đứng,** và việc chạy lại cùng một backtest hai lần phải cho ra kết quả hoàn toàn giống nhau.
- **Module crawler không bao giờ gọi trực tiếp mô hình phân tích cảm xúc.** Nó chỉ thu thập và lưu trữ bài báo. Việc phân loại cảm xúc diễn ra phía sau interface sentiment provider.
- **Không có vòng lặp vô tận (No unbounded loop).** Vòng lặp tìm kiếm bắt buộc phải có điều kiện dừng tường minh.

## Bus Sự kiện (Events)

Bên phát (publisher) và bên nhận (subscriber) kết nối với nhau thông qua tên sự kiện được định nghĩa trong `@csl/contracts`, tuyệt đối không bao giờ import lẫn nhau. Một module phát sự kiện không cần biết ai đang lắng nghe, và một module lắng nghe không cần biết ai là người phát — sự tách rời (decoupling) này chính là tiêu chí mà đề bài đang kiểm tra, vì vậy việc import một service để gọi trực tiếp thay vì phát sự kiện là một bước thụt lùi về kiến trúc ngay cả khi code vẫn chạy được.

Event bus nội tiến trình chỉ dùng cho mục đích phát thông báo (notification). Bất kỳ tác vụ nào không được phép đánh mất đều bắt buộc phải đưa vào hàng đợi job queue (BullMQ); đây là hai cơ chế hoàn toàn khác biệt nhau có chủ đích.

## Cơ sở dữ liệu (Database)

- Các tệp migration là các file lưu trong git, được review nghiêm túc như mã nguồn. Tuyệt đối không chỉnh sửa một migration đã được áp dụng.
- Prisma 7 không đi kèm query engine nhúng sẵn; kết nối database thông qua adapter driver pg bên trong `PrismaService`. Chuỗi kết nối URL nằm trong `prisma.config.ts` và `.env`, tuyệt đối không ghi cứng trong `schema.prisma`.
- Client sinh tự động được lưu vào `src/generated/prisma` và được đưa vào `.gitignore` — hãy sinh lại bằng lệnh `pnpm db:generate` sau bất kỳ thay đổi schema nào, và không bao giờ chỉnh sửa file sinh tự động này.
- Một kết quả muốn tái lập lại được trong tương lai bắt buộc phải lưu kèm những yếu tố đã tạo ra nó. Một bản ghi experiment thiếu thông tin về dataset và phiên bản chiến lược thì không thể coi là bằng chứng xác thực cho bất kỳ điều gì.

## Các bước kiểm tra trước khi xác nhận hoàn thành

```bash
pnpm --dir apps/api lint
pnpm --dir apps/api exec tsc --noEmit
pnpm --dir apps/api build
```

Hãy chạy đầy đủ các lệnh kiểm tra này, và gọi thử endpoint ít nhất một lần. Build thành công chưa đồng nghĩa với việc đã xác thực đúng.
