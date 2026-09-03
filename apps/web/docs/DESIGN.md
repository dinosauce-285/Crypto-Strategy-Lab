---
name: Crypto Strategy Lab
description: Nền tảng phân tích, kiểm thử lịch sử và xếp hạng các chiến lược giao dịch crypto.
colors:
  bg: "#181a20"
  surface: "#1e2329"
  raised: "#2b3139"
  line: "#2b3139"
  lineStrong: "#363a45"
  ink: "#eaecef"
  muted: "#848e9c"
  faint: "#5e6673"
  accent: "#fcd535"
  accentPress: "#f0b90b"
  onAccent: "#202630"
  ok: "#0ecb81"
  bad: "#f6465d"
  okWash: "#10251d"
  badWash: "#2a1a1e"
  accentWash: "#2a2413"
typography:
  title:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  heading:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
  reading:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.3
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.85rem"
  lg: "1.25rem"
components:
  btn-action:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "2rem"
    padding: "0 0.75rem"
  btn-action-hover:
    backgroundColor: "{colors.lineStrong}"
  btn-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.onAccent}"
    fontWeight: 600
  btn-primary-hover:
    backgroundColor: "{colors.accentPress}"
  pair-select:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "2rem"
    padding: "0 0.6rem"
  seg-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.sm}"
    height: "1.75rem"
  seg-item-selected:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.accent}"
    fontWeight: 600
  panel-box:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0.85rem"
  data-table:
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    padding: "0.45rem 0.6rem"
  data-table-row-hover:
    backgroundColor: "{colors.raised}"
  badge-pos:
    textColor: "{colors.ok}"
    backgroundColor: "{colors.okWash}"
  badge-neg:
    textColor: "{colors.bad}"
    backgroundColor: "{colors.badWash}"
  state-line:
    textColor: "{colors.muted}"
    typography: "{typography.data}"
---

# Hệ thống Thiết kế (Design System): Crypto Strategy Lab

## 1. Tổng quan (Overview)

**Kim chỉ nam sáng tạo (Creative North Star): "The Exchange Terminal" (Terminal sàn giao dịch chuyên nghiệp)**

Đây là nơi trực tiếp thao tác và làm việc với các con số, không phải là một bài báo cáo màu mè về chúng. Màu nền là màu gần đen (near-black) tương tự các sàn giao dịch tài chính, giúp các cây nến xanh lá và đỏ đạt độ tương phản cao nhất, đồng thời tạo cảm giác quen thuộc cho người dùng vốn đã quen đọc hàng trăm màn hình tương tự — sự quen thuộc chính là tính năng. Các panel là những mặt phẳng không viền sáng hơn màu nền một nấc; ranh giới giữa các khối là sự thay đổi mặt phẳng hoặc đường kẻ mảnh (hairline), tuyệt đối không vẽ khung viền dày chỉ để trang trí. Một sắc hổ phách (amber) duy nhất phụ trách mọi điểm tương tác quyết định của người dùng.

Mật độ thông tin phục vụ trực tiếp tác vụ. Cỡ chữ nội dung là 14px, cỡ chữ bảng dữ liệu là 13px, và màn hình chiếm toàn bộ chiều rộng vì một bảng rộng luôn tiện theo dõi hơn một bảng hẹp. Khi một con số và một nhãn chữ đặt cạnh nhau, con số dùng font mono (đơn cách) còn nhãn chữ dùng font sans, giúp cột giá cả thẳng hàng tăm tắp mà câu văn bên cạnh không bị khô khan như output dòng lệnh.

Hệ thống kiên quyết từ chối hai phong cách thiết kế tiêu cực gần với chủ đề này: **Sàn giao dịch neon** — dải màu chuyển tím sang lục lam, hiệu ứng phát sáng glow, các con số nhấp nháy, huy hiệu chúc tụng — và **Ứng dụng đầu tư cho người mới bắt đầu** — mũi tên quá khổ, tỷ lệ phần trăm phóng to, các yếu tố hối thúc. Nền tối và sắc hổ phách là bộ đồng phục làm việc nghiêm túc của ngành; dải màu gradient và hiệu ứng phát sáng chỉ là lớp hóa trang lòe loẹt.

**Đặc điểm chính:**
- Ba mặt phẳng: nền trang `#181a20`, panel chứa dữ liệu `#1e2329`, khối điều khiển nổi `#2b3139`.
- Một màu nhấn duy nhất, hổ phách `#fcd535` — nút hành động chính, tab đang chọn, mục đang chọn, không dùng cho mục đích khác.
- IBM Plex Sans cho chữ văn bản, IBM Plex Mono cho các con số. Cùng một siêu họ font (superfamily), hai phong cách chuyên biệt.
- Thanh điều hướng trên cùng (top bar) và thanh ticker giá trực tiếp; không gian màn hình bên dưới dàn trải toàn chiều rộng.
- Bốn trạng thái bắt buộc trên mọi bề mặt — loading, empty, error, data — và không trạng thái nào được phép gây nhầm lẫn với trạng thái khác.

## 2. Màu sắc (Colors)

Ba mặt phẳng trung tính, một màu nhấn hổ phách, và xanh/đỏ chỉ dành riêng cho chiều hướng giao dịch.

### Màu chính (Primary)
- **Hổ phách (Amber)** (`#fcd535`): màu nhấn duy nhất. Nút bấm chính, tab đang kích hoạt, viền và nền mờ của thẻ được chọn, đường chỉ báo MA chồng lên chart, top 3 bảng xếp hạng, và viền focus. Trạng thái khi bấm (pressed) là `#f0b90b`; chữ hiển thị trên nền này là `#202630`.

### Màu trung tính (Neutral)
- **Nền trang (Ground)** (`#181a20`): màu nền toàn trang.
- **Panel** (`#1e2329`): bề mặt chứa dữ liệu. Không dùng viền bao — sự thay đổi mặt phẳng chính là ranh giới.
- **Khối nổi (Raised)** (`#2b3139`): bất kỳ thành phần nào có thể tương tác. Nút bấm, ô nhập liệu, dòng đang hover, thẻ pill.
- **Mực văn bản (Ink)** (`#eaecef`): chữ nội dung và mọi con số.
- **Mờ (Muted)** (`#848e9c`): nhãn chú thích, tiêu đề cột, câu mô tả trạng thái. Đạt tương phản 5.2:1 trên nền trang và 4.8:1 trên panel, đảm bảo đọc rõ ràng thay vì chỉ để trang trí.
- **Mờ nhạt (Faint)** (`#5e6673`): chữ của nút bị vô hiệu hóa (disabled), và đoạn trung tính trên thanh tiến trình.
- **Đường kẻ mảnh (Hairline)** (`#2b3139`) và **Đường kẻ đậm (Strong hairline)** (`#363a45`): đường phân cách duy nhất, độ dày 1px.

### Màu ngữ nghĩa (Semantic)
- **Tăng / Mua (Up / buy)** (`#0ecb81`) và **Giảm / Bán (Down / sell)** (`#f6465d`). Mỗi trạng thái đúng một giá trị màu duy nhất, áp dụng chung cho cả điểm đánh dấu lẫn chữ viết: thân nến, cột khối lượng volume, điểm đánh dấu trên biểu đồ và cột lợi nhuận đều dùng chung sắc xanh và đỏ này. Sắc đỏ đạt tương phản 4.48:1 trên panel — thấp hơn một chút so với sàn chuẩn AA (4.5:1) — nhưng vẫn được giữ nguyên vì phương án thay thế là một màu đỏ lệch chuẩn của ngành. Tệp `UI_CONSTRAINT.md` đã ghi nhận rõ ngoại lệ này; ADR 0051 lưu trữ quyết định.
- **Nền màu mờ (Washes)** (`#10251d`, `#2a1a1e`, `#2a2413`): là màu nền cho các thẻ pill có màu. Chúng *tối hơn* mặt phẳng phía sau, không phải là lớp màu trong suốt: lớp phủ trong suốt sẽ làm sáng màu nền và kéo độ tương phản của chữ xuống.

### Các quy tắc đặt tên màu (Named Rules)

**Quy tắc Chỉ dùng cho Ý nghĩa (The Meaning-Only Rule).** Màu sắc chỉ xuất hiện khi nó thực sự mang thông tin và không dùng ở bất kỳ nơi nào khác. Tiêu đề không tô màu vàng hổ phách chỉ vì "trông đẹp"; panel không đổi màu chỉ để khoe rằng nó là một panel.

**Quy tắc Không đứng đơn độc (The Never-Alone Rule).** Xanh lá và đỏ không bao giờ truyền tải ý nghĩa một mình. Mua và bán, lời và lỗ, tăng và giảm bắt buộc phải đọc hiểu được dưới thang xám thông qua chữ viết, hình khối hoặc vị trí. Một người mù màu hoặc một bản in đen trắng vẫn rút ra kết luận chính xác như nhau.

**Quy tắc Một màu đỏ duy nhất (The One-Red Rule).** Chỉ có một mã màu đỏ và một mã màu xanh lá, điểm đánh dấu và câu chữ đều dùng chung một mã. Việc tạo thêm mã màu thứ hai chỉ để hợp với nền là khởi đầu cho sự trôi dạt bảng màu và khiến các lập trình viên sau này lúng túng không biết chọn token nào.

## 3. Kiểu chữ (Typography)

**Font nội dung / UI:** IBM Plex Sans (400 / 500 / 600).
**Font số liệu:** IBM Plex Mono (400 / 500 / 600).

**Đặc tính:** Một siêu họ font chia làm hai phong cách. Font sans phụ trách mọi từ ngữ — tiêu đề, nhãn, nút bấm, câu văn — để đọc tự nhiên như văn bản thông thường. Font mono phụ trách mọi con số, đảm bảo khi một mức giá thay đổi từ `64,231.10` thành `9,842.05` thì cả dòng dữ liệu không bị giật hay lệch vị trí dưới mắt người đọc. Thuộc tính `font-variant-numeric: tabular-nums` được kích hoạt ở mọi nơi các chữ số xếp chồng lên nhau.

### Hệ thống thứ bậc (Hierarchy)
- **Title** (Sans 600, 1.125rem): tên màn hình. Xuất hiện một lần duy nhất trên mỗi trang, phụ đề nằm trên cùng baseline.
- **Heading** (Sans 600, 0.9375rem): tên của panel, nằm ngay trên đường kẻ mảnh ngăn cách với nội dung.
- **Body** (Sans 400, 0.875rem): các câu văn, giới hạn độ dài từ 65–75 ký tự.
- **Reading** (Mono 500, 1rem): giá trị của một chỉ số đo lường (metric).
- **Data** (Mono 400, 0.8125rem): các ô trong bảng dữ liệu. Con số căn phải, cột đầu tiên căn trái.
- **Label** (Sans 400, 0.75rem, Muted): tiêu đề cột, chú thích số liệu, nguồn gốc dữ liệu. Không bao giờ viết in hoa dãn khoảng cách (uppercase-tracked).

### Các quy tắc đặt tên kiểu chữ (Named Rules)

**Quy tắc Số là Mono (The Figure-Is-Mono Rule).** Nếu là một con số đo lường, dùng font Mono. Nếu là một từ ngữ, dùng font Sans. Một ô trong bảng chứa câu văn sẽ gắn class `.text-cell` để chuyển về font Sans.

**Quy tắc Không dùng Kicker (The No-Kicker Rule).** Không chèn dòng chữ nhỏ in hoa dãn cách bên trên tiêu đề phân mục. Một panel được định danh bằng chính heading của nó và không thêm gì khác.

## 4. Bố cục (Layout)

Khung cố định gồm ba hàng: thanh top bar 3.5rem, thanh ticker giá 2.25rem, và màn hình làm việc chính tự cuộn bên trong để toàn bộ trang web không bao giờ bị cuộn giật. Thanh top bar chứa logo thương hiệu, 5 tab điều hướng và trạng thái kết nối kênh push — thông tin đồng nhất trên mọi màn hình.

Mỗi màn hình gồm phần đầu (head) và phần thân (body). Phần thân chia thành cột chính `1fr` và cột bên (side rail) 20rem: đối tượng làm việc chính ở bên trái, các công cụ điều khiển và chỉ số đo lường ở bên phải. Các panel cách nhau 0.85rem; bên trong panel các phần cách nhau 0.6rem; giữa các nút điều khiển đi liền nhau cách nhau 0.5rem.

Hành vi responsive mang tính cấu trúc. Tên thương hiệu rút gọn dưới 900px. Dưới 720px cột bên sẽ chuyển xuống dưới cột chính, lưới 4 biểu đồ chuyển thành 4 hàng xếp dọc toàn chiều rộng, và — chi tiết quan trọng nhất — cơ chế tự lấp đầy chiều cao của desktop (`flex: 1` kèm `min-height: 0`) bị tắt đi, tránh việc phần tử dài đè lên nội dung bên dưới. Bảng dữ liệu tự cuộn ngang bên trong container của chính nó; toàn bộ trang web không bao giờ bị cuộn ngang.

### Các quy tắc đặt tên bố cục (Named Rules)

**Quy tắc Chuyển giao Chiều cao (The Height-Handoff Rule).** Thuộc tính `.grows` (`flex: 1; min-height: 0`) chỉ được đặt trên một box chứa vùng tự cuộn riêng (scroller) hoặc chứa biểu đồ chart. Đặt nó lên một box chỉ chứa các đoạn text xếp chồng sẽ khiến text bị tràn đè lên panel tiếp theo.

## 5. Độ cao & Chiều sâu (Elevation & Depth)

Chiều sâu được thể hiện bằng sự thay đổi mặt phẳng: nền trang (ground), panel, khối nổi (raised). Ba cấp độ, cùng đường kẻ mảnh 1px hairline khi hai vùng tiếp giáp nhau trên cùng mặt phẳng. Không panel nào dùng bóng đổ (box-shadow) và sẽ không bao giờ dùng.

Ngoại lệ duy nhất là các tầng thực sự trôi nổi trên bề mặt nội dung: menu dropdown và modal hộp thoại, hai thành phần này dùng hai token bóng đổ duy nhất của hệ thống (`--shadow-menu`, `--shadow-modal`) kèm lớp phủ mờ nền `--overlay`. Không thành phần nào khác được phép tham chiếu các token này.

### Các quy tắc đặt tên độ cao (Named Rules)

**Quy tắc Ba Mặt phẳng (The Three-Plane Rule).** Nền trang, panel, phần tử tương tác. Một box nằm trong một box không được tạo thêm màu nền thứ ba — `.panel-box` nằm trong `.panel-box` sẽ tự động làm phẳng chính nó.

### Bề mặt Trình duyệt (Browser surfaces)

Khai báo `color-scheme: dark` ở cấp root và trong thẻ head của tài liệu, giúp các điều khiển mặc định, bộ chọn ngày và thanh cuộn của trình duyệt đồng bộ theo nền tối thay vì dùng giao diện mặc định của hệ điều hành, và trình duyệt render nền tối ngay trước khi file CSS tải xong. Vùng bôi đen văn bản (text selection) dùng màu `--accent-dim` sau lớp chữ Ink, không dùng màu xanh dương của trình duyệt. Thanh cuộn rộng 8px, màu strong-hairline ở trạng thái nghỉ và chuyển sang Muted khi hover, trên nền rãnh trong suốt. Các tiêu đề kích hoạt `text-wrap: balance`.

## 6. Hình khối (Shapes)

Ba kích thước bo góc: 4px cho nút điều khiển hoặc thẻ pill, 8px cho panel, 12px cho modal hộp thoại. Mọi thành phần khác đều vuông góc.

Đường viền có độ dày 1px và chỉ xuất hiện khi cần ngăn cách hai thành phần. Không có đường viền 2px trong hệ thống này, không có dải sọc màu chạy dọc một bên, và một thẻ card được chọn sẽ được phân biệt bằng viền của nó *cộng với* một lớp nền mờ (wash) cùng tông màu, giúp trạng thái này vẫn nhận diện rõ dưới thang xám.

### Các quy tắc đặt tên hình khối (Named Rules)

**Quy tắc Góc Bo Thao tác (The Operable-Corner Rule).** 4px nghĩa là bạn có thể bấm/thao tác vào nó; 8px nghĩa là nó đang chứa đựng một khối nội dung; 12px nghĩa là nó đang trôi nổi phía trên trang.

## 7. Các Thành phần (Components)

### Thanh Top bar
- **Cấu trúc:** thương hiệu (logo + tên) · 5 màn hình chính · trạng thái kết nối kênh push, đẩy sang góc phải.
- **Trạng thái tab:** Nghỉ: chữ Muted trên nền trong suốt. Hover: chữ Ink trên nền Panel. Đang chọn: chữ Hổ phách in đậm 600 — thay đổi cả màu lẫn độ đậm font chữ cùng lúc để phân biệt tốt dưới thang xám.
- Thanh điều hướng tự cuộn ngang không hiện thanh cuộn thay vì bị rớt dòng.

### Thanh Ticker giá
- **Đặc tính:** hiển thị khớp lệnh gần nhất của mọi cặp coin đang theo dõi, xuất hiện đồng nhất trên mọi màn hình.
- **Phong cách:** Nền Panel, cao 2.25rem, một đường kẻ mảnh bên dưới. Tên cặp coin màu Muted; giá tiền dùng font Mono, tô màu theo chiều mua/bán từ server (`data-side`), kèm chữ Buy/Sell viết rõ ràng bên cạnh.
- **Mất kết nối:** khi kênh push bị ngắt, màu sắc biến mất, mức giá giữ nguyên giá trị gần nhất và thanh hiển thị thông báo "Mất kết nối — giá đang đứng yên." Một dấu gạch ngang biểu thị dữ liệu chưa từng đến.
- Chỉ hiển thị đúng những gì tin nhắn mang đến. Không hiển thị % thay đổi 24h và không có mũi tên chiều hướng, vì những dữ liệu đó không có trong payload và trình duyệt không được phép tự tính toán.

### Thẻ trạng thái Kênh push (Channel status pill)
- Ba trạng thái, mỗi trạng thái gồm một chấm tròn *và* một từ ngữ: `live` màu xanh lá, `connecting` màu muted, `down` màu đỏ kèm viền đỏ. Thuộc tính `role="status"`.

### Bộ chuyển đổi phân đoạn Segmented switcher (khung thời gian, loại coin)
- **Hình khối:** máng trượt Panel đệm 2px; các nút con cao 1.75rem, bo góc 4px.
- **Trạng thái:** Nghỉ: chữ Muted trên nền trong suốt. Hover: chữ Ink trên nền Raised. Đang chọn: chữ Hổ phách font 600 trên nền Raised, kèm `aria-pressed="true"`.

### Nút bấm (Buttons)
- **`.btn-action`** — Nền Raised, chữ Ink, bo góc 4px, cao 2rem. Hover đổi sang strong-hairline, active chuyển về Panel, disabled đổi chữ sang Faint.
- **`.btn-primary`** — Nền Hổ phách, chữ `--on-accent`, font 600. Mỗi khu vực màn hình chỉ có duy nhất một nút chính.
- **`.btn-ghost`** — Nền trong suốt với viền strong-hairline, dùng cho hành động phụ bên trong một panel đã có sẵn nút chính.
- **Các class bổ trợ:** `.btn-lg` (2.5rem), `.btn-sm` (1.625rem), `.btn-block`, `.btn-step`.
- Một nút bấm thả trực tiếp vào `.panel` sẽ căn lề ở điểm bắt đầu thay vì kéo dãn toàn bộ; class `.btn-block` dùng khi muốn nút kéo dãn 100%.

### Ô nhập liệu (Fields)
- Dùng thống nhất một class `.pair-select` cho ô select, text, number và date, giúp một hàng gồm nhiều ô nhập liệu có chiều cao bằng nhau tuyệt đối mà không cần phải căn chỉnh thủ công. Nền Raised, không viền ở trạng thái nghỉ, viền strong-hairline khi hover, viền `--bad` khi gặp lỗi `aria-invalid`.
- **Thông báo lỗi:** `.field-error`, 0.75rem, màu đỏ chữ. Luôn là một câu văn hoàn chỉnh, không dùng một ký hiệu đơn độc.

### Bảng dữ liệu (Data table)
- **Phong cách:** không viền ngoài, không dùng màu ngựa vằn (zebra stripes). Một đường kẻ mảnh dưới mỗi hàng và không kẻ ở hàng cuối cùng. Hàng tiêu đề dùng chữ Label / Muted, kích hoạt `position: sticky` trên nền panel để giữ cố định khi cuộn trang dài.
- **Căn chỉnh:** con số căn phải, cột đầu tiên căn trái, dùng font mono xuyên suốt; ô nào chứa câu văn sẽ dùng class `.text-cell`.
- **Tương tác:** hàng có `role="button"` sẽ đổi màu sang Raised khi hover; hàng đang được chọn giữ nguyên màu nền đó và có một vạch hổ phách 2px ở mép ô đầu tiên.
- **Xử lý tràn:** `.table-scroll` (hoặc `.table-scroll-capped` khi bảng nằm chung panel với biểu đồ). Trang web không bao giờ bị cuộn ngang.

### Khối hiển thị số liệu (Figures)
- **`.stat-tile`** gồm một nhãn chữ nằm trên một giá trị số, không có khung viền bao quanh — khoảng cách giữa các ô lưới (grid gaps) tự đóng vai trò ngăn cách. Lưới chia theo `repeat(auto-fit, minmax(8rem, 1fr))`, tự động hiển thị 2 cột ở thanh bên và 4 cột trên panel rộng mà không cần viết breakpoint riêng.
- Một con số chỉ gắn class `.ok` / `.bad` khi chiều hướng là yếu tố cốt lõi; thẻ `.stat-tile-note` đi kèm sẽ ghi rõ khoảng xếp loại ("Tốt (>1.5)"), đảm bảo màu sắc không bao giờ là tín hiệu duy nhất.

### Huy hiệu (Badges)
- Thẻ pill có màu mờ, không viền: `badge-pos` (chữ xanh trên nền 12% green wash), `badge-neg`, `badge-neu` (chữ Muted trên nền Raised), `badge-key` (chữ Hổ phách trên nền 12% amber wash). Luôn luôn chứa một từ ngữ, không bao giờ chỉ là một chấm tròn trơ trọi.

### Biểu đồ (Chart)
- Nền trong suốt — panel đóng vai trò là khung chứa; không có viền và không có góc bo riêng.
- Lưới tọa độ, đường viền trục, con trỏ crosshair và màu sắc các chuỗi dữ liệu đều đọc trực tiếp từ file token lúc khởi tạo, giúp toàn bộ theme biểu đồ được quản lý tập trung tại một file duy nhất.
- Nến dùng màu `--ok` / `--bad`; đường MA dùng màu `--accent`; vùng hỗ trợ và kháng cự dùng màu `--ok` / `--bad` kèm nhãn tên rõ ràng.
- **`.chart-status-row`** là hàng hiển thị thực tế phía trên biểu đồ, căn phải, chứa huy hiệu trạng thái kết nối; thẻ pill chọn timeframe được định vị tuyệt đối ở bên trái. Trước đây từng thử phương án vẽ lớp phủ overlay nhưng bị đè lên nhãn thang giá của biểu đồ.
- **Mất kết nối / Dữ liệu cũ:** biểu đồ giảm độ mờ xuống 40% (opacity) và xuất hiện banner thông báo rõ dữ liệu bị ngắt từ thời điểm nào. Tuyệt đối không xóa trắng biểu đồ (làm người dùng mất dấu quan sát) và không giữ nguyên 100% độ rõ (khiến người dùng tưởng nhầm là dữ liệu vẫn đang chạy trực tiếp).

### Các trạng thái màn hình (Stages: loading / empty / error)
- **`.stage`** là cột căn giữa trên mặt phẳng Panel với chiều cao tối thiểu 17.5rem, giúp màn hình không bị giật nhảy bố cục khi dữ liệu xuất hiện. Dùng `.stage-dashed` cho trạng thái empty đang chờ hành động từ người dùng thay vì chờ máy chủ.
- **Loading:** thông báo rõ ràng hệ thống đang chờ đợi điều gì. **Empty:** hướng dẫn cụ thể hành động nào sẽ kết thúc việc chờ đợi. **Error:** chữ đỏ ngữ nghĩa, giải thích sự cố gì đã xảy ra và cung cấp nút thử lại. Mọi thông báo đều là câu văn hoàn chỉnh.

### Hộp thoại Modal
- Bo góc 12px, nền Panel, viền strong-hairline, bóng đổ `--shadow-modal`, hiển thị trên lớp phủ mờ `--overlay`. Hiệu ứng mờ dần và nâng lên 6px trong 180ms, và tự động tắt chuyển động khi người dùng bật `prefers-reduced-motion: reduce`.
- Khóa con trỏ focus bên trong modal (focus trapped), phím Escape đóng modal, và focus tự động quay trở về phần tử đã kích hoạt mở nó.

## 8. Chuyển động (Motion)

Thời gian 120ms cho hover, 180ms cho thay đổi trạng thái, sử dụng đường cong `cubic-bezier(0.25, 1, 0.5, 1)`. Chỉ áp dụng cho màu sắc, độ mờ (opacity), biến đổi hình học (transform) và chiều rộng — không bao giờ can thiệp vào thuộc tính bố cục layout. Không dùng hiệu ứng nảy (bounce), không co dãn đàn hồi (elastic), không hiệu ứng xuất hiện rườm rà: người dùng đang tập trung giải quyết công việc.

Mọi hiệu ứng chuyển động đều có nhánh `prefers-reduced-motion: reduce` để loại bỏ hoàn toàn thay vì chỉ rút ngắn thời gian.

## 9. Những điều Nên làm và Không được làm (Do's and Don'ts)

### Nên làm (Do):
- **Nên** dùng font Mono cho số liệu và font Sans cho từ ngữ.
- **Nên** thể hiện chiều sâu bằng ba mặt phẳng kết hợp đường kẻ mảnh 1px hairline, không dùng bóng đổ.
- **Nên** áp dụng cho mọi phần tử focus được cùng một vòng viền hổ phách 2px với độ lệch 1px offset.
- **Nên** kết hợp mọi màu xanh lá hoặc đỏ với một từ ngữ hoặc hình khối biểu tượng, đảm bảo ý nghĩa vẫn trọn vẹn dưới thang xám. Đây là điều kiện tiên quyết để chấp nhận mức tương phản 4.48:1 của màu đỏ.
- **Nên** viết cả bốn trạng thái màn hình dưới dạng các câu văn hoàn chỉnh nêu rõ điều gì đang diễn ra và bước tiếp theo cần làm gì.
- **Nên** duy trì một chiều cao điều khiển đồng nhất trên mỗi hàng (2rem) và bộ ba kích thước bo góc chuẩn (4 / 8 / 12).

### Không được làm (Don't):
- **Không** xây dựng **sàn giao dịch neon**: không dải màu gradient, không hiệu ứng phát sáng glow, không số nhấp nháy, không huy hiệu chúc tụng.
- **Không** xây dựng **ứng dụng đầu tư cho người mới bắt đầu**: không mũi tên quá khổ, không phóng đại tỷ lệ phần trăm, không yếu tố thúc giục tâm lý.
- **Không** thêm thuộc tính `box-shadow` ra ngoài phạm vi menu dropdown và modal.
- **Không** lồng `.panel-box` bên trong `.panel-box` với kỳ vọng sẽ có một màu nền thứ ba.
- **Không** đặt thuộc tính `.grows` lên một box chỉ chứa các đoạn text xếp chồng.
- **Không** thêm họ font thứ ba, và tuyệt đối không dùng font nghệ thuật (display face).
- **Không** chèn dòng chữ nhỏ in hoa dãn cách (kicker) phía trên tiêu đề mục.
- **Không** dùng đường kẻ viền trái `border-left` dày hơn 1px làm dải màu nhấn trang trí.
- **Không** tự tính toán tỷ lệ phần trăm, chiều hướng tăng giảm hoặc lợi nhuận bên trong component để tô màu — nếu con số chưa có trong phản hồi API, nơi cần thay đổi là API backend.
