# UI Inventory — Mockup giao diện "Crypto Strategy Lab"

> Lưu ý: đây là bước liệt kê thuần túy các thành phần UI xuất hiện trong 5 ảnh mockup
> (`1-Realtime.jpg`, `2-StrategyEngine.jpg`, `3-Discovery.jpg`, `4-Backtest.jpg`,
> `5-NewsCrawler.jpg`). Không đánh giá đúng/sai hay mức độ cần thiết ở bước này.

## Thành phần chung (xuất hiện trên mọi màn hình)

- Logo + tên app "Crypto Strategy Lab" (icon bình thí nghiệm) ở góc trên trái
- Sidebar điều hướng dọc bên trái, gồm các mục: **Realtime, Strategy Engine, Discovery,
  Backtest, News Crawler, Settings** (mỗi mục có icon riêng, mục đang active được highlight
  màu tím/xanh)
- Khối thông tin gói cước ở cuối sidebar: badge "Pro Student" (icon mũ tốt nghiệp), dòng
  "Gói đang dùng", dòng "Hết hạn: 20/06/2025"
- Khối thông tin tài khoản ở cuối sidebar: avatar tròn, tên "Nguyễn Minh", email
  "student@example.com", mũi tên dropdown (chevron xuống)
- Thanh trạng thái nguồn dữ liệu ở góc trên phải: chấm tròn xanh + text "Nguồn dữ liệu:
  Binance API + WebSocket"
- Icon dấu hỏi (help) ở góc trên phải
- Icon chuông thông báo (notification) ở góc trên phải, có chấm đỏ báo có thông báo mới
- Tiêu đề trang (heading lớn) + dòng mô tả phụ (subheading nhỏ, màu xám) riêng cho từng
  màn hình

---

## Màn hình 1: Realtime Chart – Đa khung thời gian (`1-Realtime.jpg`)

### Thanh bộ lọc trên cùng
- Dropdown "Pair / Coin": chọn BTCUSDT (có icon coin BTC)
- Nhóm nút chọn "Khung thời gian": 1m, 5m, 15m, 1h, 4h (1m đang được chọn/active)
- Toggle switch "Realtime" (đang bật/ON)
- Badge trạng thái "● Đang nhận dữ liệu" (chấm xanh nhấp nháy)

### Lưới 4 biểu đồ candlestick (BTCUSDT theo 4 khung: 1m, 5m, 15m, 1h)
Mỗi ô biểu đồ gồm:
- Tiêu đề cặp coin + khung thời gian (VD: "BTCUSDT · 1m") kèm chấm trạng thái xanh
- Giá hiện tại (VD: 69,342.18) + % thay đổi (màu xanh/đỏ, VD: +0.28%, -0.15%)
- Badge tín hiệu **BUY** (xanh) hoặc **SELL** (đỏ)
- Chỉ số MA(20) kèm giá trị
- Biểu đồ nến (candlestick chart) với đường MA(20) chồng lên
- Đường kẻ ngang đứt nét thể hiện mức giá hiện tại, có nhãn giá kèm màu nền theo hướng
  tăng/giảm
- Trục giá bên phải (price axis)
- Biểu đồ Volume dạng cột bên dưới candlestick, có trục giá trị riêng (VD: 1K, 5K, 10K, 40K)
- Trục thời gian bên dưới (time axis)
- Link/nút "⬇ Load 1000 nến lịch sử"
- Trạng thái "⟳ Cập nhật realtime" kèm chấm tròn xanh nhấp nháy

### Panel bên phải
- Khối "Logic cập nhật candle" (có icon info):
  - Mục "Trùng nến cuối → Update candle": mô tả + minh họa 2 cụm nến (before/after) nối
    bằng mũi tên
  - Mục "Nến mới hoàn toàn → Append candle": mô tả + minh họa 2 cụm nến nối bằng mũi tên
- Khối "Trạng thái kết nối":
  - Trạng thái tổng: "● Đã kết nối"
  - Dòng "Nguồn dữ liệu": Binance API + WebSocket
  - Dòng "Độ trễ (Latency)": 102 ms
  - Dòng "Dữ liệu cuối": 10:45:38
  - Dòng "Kết nối": Ổn định
- Khối "Recent Ticks (BTCUSDT)": bảng gồm các cột **Thời gian, Giá, Khối lượng, Loại**
  (Loại = Buy màu xanh / Sell màu đỏ), 5 dòng dữ liệu mẫu
- Khối "Chú thích" (legend):
  - Ô màu xanh + "Nến tăng (Close > Open)"
  - Badge "BUY" + "Tín hiệu Mua"
  - Ô màu đỏ + "Nến giảm (Close < Open)"
  - Badge "SELL" + "Tín hiệu Bán"
  - Đường màu xanh dương + "MA(20) – Đường trung bình động 20"
  - Ô màu tím nhạt + "Volume – Khối lượng giao dịch"

---

## Màn hình 2: Tạo Strategy từ Prompt / URL (`2-StrategyEngine.jpg`)

- Dòng mô tả phụ: "Người dùng nhập ngôn ngữ tự nhiên hoặc link website để hệ thống sinh
  strategy và lưu vào thư viện"

### Cột 1: Nhập liệu
- Khối "Nhập mô tả strategy" (icon info):
  - Textarea nhập mô tả ngôn ngữ tự nhiên (có nội dung mẫu về RSI + Bollinger Band)
  - Bộ đếm ký tự "97/1000"
  - Nút "⚡ Phân tích bằng LLM" (nút chính, màu tím)
  - Nút "🗑 Xóa" (nút phụ, outline)
- Khối "Nhập URL chiến lược" (icon info):
  - Input nhập URL (placeholder link TradingView mẫu)
  - Dòng gợi ý "Hỗ trợ: TradingView, Blogger, Medium, GitHub Gist, Docs…"
  - Nút "🌐 Trích xuất từ website"

### Cột 2: Kết quả phân tích
- Khối "Strategy đã phân tích", gồm các thẻ con:
  - "🟢 Điều kiện LONG": RSI(14) < 30; Giá đóng cửa nằm dưới Bollinger Lower Band (20, 2)
  - "🔴 Điều kiện SHORT": RSI(14) > 70; Giá đóng cửa nằm trên Bollinger Upper Band (20, 2)
  - "⚖ Quản trị rủi ro": Stop Loss 2%; Take Profit 4%
  - "🕐 Khung thời gian": 1h (mặc định)
  - "🔗 Áp dụng cho cặp": Tất cả cặp USDT (Có thể tùy chỉnh)

### Cột 3: JSON định nghĩa
- Khối "Định nghĩa strategy (JSON)" với nút "📋 Sao chép"
- Khối code JSON hiển thị đầy đủ cấu trúc: name, version, description, indicators,
  conditions (long/short), riskManagement (stopLoss, takeProfit), timeframe,
  applicability (pairs, market)

### Cột 4: Kiểm tra & Lưu
- Khối "Kiểm tra & Validation":
  - "Thiếu trường bắt buộc: Không có" (dấu tick xanh)
  - "Kiểm tra logic: Logic hợp lệ" (dấu tick xanh)
  - "Chỉ báo hỗ trợ: Tất cả chỉ báo được hỗ trợ" (dấu tick xanh)
  - Banner trạng thái tổng: "Trạng thái — Hợp lệ để lưu vào thư viện" (nền xanh, dấu tick)
- Khối "Lưu vào Strategy Library":
  - Input "Name" (VD: RSI_BB_LB_LONG_SL2_TP4)
  - Input "Version" (VD: 1.0.0)
  - Trường "Tags" dạng chip có thể xóa (RSI, Bollinger, Mean Reversion, Long) + nút thêm
  - Dropdown "Source" (VD: USER_PROMPT)
  - Nút "💾 Lưu Strategy" (nút chính, full-width, màu tím)

### Bảng dưới cùng: "Chiến lược đã import gần đây"
- Link "Xem tất cả →" ở góc phải tiêu đề
- Cột bảng: Tên strategy, Source (badge USER_PROMPT/WEB_IMPORT), Ngày tạo, Version, Tags
  (nhiều badge), Trạng thái (badge "● Hợp lệ"), Hành động (nút ▶ play + nút ⋮ menu)
- 2 dòng dữ liệu mẫu

---

## Màn hình 3: Strategy Engine & Loop Discovery (`3-Discovery.jpg`)

- Dòng mô tả phụ: "Tạo strategy đơn, strategy kết hợp và tự động tìm biến thể tốt nhất"

### Cột 1: "Strategy đơn" (icon info)
- Danh sách card strategy có thể chọn, mỗi card gồm icon + tên + mô tả ngắn + mũi tên (>):
  RSI, MA, Bollinger Bands, Support / Resistance, SMC, Wyckoff
- Nút "+ Tạo strategy đơn mới" ở cuối danh sách

### Cột 2: "Strategy kết hợp" (icon info)
- Label "Chọn các strategy để kết hợp"
- Multi-select hiển thị dạng chip có thể xóa (MA, RSI, Support/Resistance — chip cam nổi
  bật) + dropdown chevron
- Label "Gợi ý kết hợp nhanh" + các nút preset: "MA + RSI", "RSI + Bollinger",
  "MA + RSI + S/R" (đang được chọn/active)
- Khối "Weighted Voting (Tín hiệu tổng hợp)" (icon info):
  - Bảng gồm cột: checkbox bật/tắt, Indicator (MA(20,50), RSI(14), Support/Resistance),
    Trọng số (thanh slider + giá trị số: 0.40/0.30/0.30), Tín hiệu (icon mũi tên
    lên/xuống thể hiện chiều tín hiệu)
- Khối "Tín hiệu tổng hợp hiện tại": 3 thẻ **LONG** (0.62, mũi tên lên, xanh), **HOLD**
  (-0.08, dấu gạch ngang, xám), **SHORT** (-0.54, mũi tên xuống, đỏ)
- Dòng "Ngưỡng vào lệnh: |score| ≥ 0.30" + trạng thái "Cập nhật realtime" (chấm xanh)
- Nút "Lưu strategy kết hợp" (nút chính, xanh dương)
- Nút "▷ Backtest ngay" (nút phụ, outline)

### Cột 3: "Loop Discovery" (icon info)
- Sơ đồ quy trình dạng pipeline ngang với 5 bước, mỗi bước có icon tròn + tên + mô tả ngắn,
  nối bằng mũi tên:
  1. Generate (Tạo biến thể) — icon đũa thần
  2. Backtest (Kiểm tra hiệu suất trên lịch sử) — icon nến
  3. Evaluate (Đánh giá theo chỉ số) — icon biểu đồ đường
  4. Rank (Xếp hạng các strategy) — icon biểu đồ cột
  5. Leaderboard (Hiển thị top strategy) — icon cúp

### Khối "Leaderboard (Top strategies)"
- Bảng gồm cột: Rank (huy chương vàng/bạc/đồng cho top 3, số cho hạng 4-5), Strategy
  (dạng chip nối bằng dấu +), Profit (USDT), Winrate
- 5 dòng dữ liệu mẫu

### Khối "Phương pháp Discovery" (icon info)
- 3 lựa chọn dạng radio button, mỗi lựa chọn có icon + tên + mô tả:
  - Random Search (đang được chọn) — "Sinh ngẫu nhiên các biến thể"
  - Domain-guided Search — "Tìm kiếm dựa trên kiến thức và ràng buộc"
  - Genetic Search — "Tiến hóa qua chọn lọc và lai ghép"

### Khối "Tiến trình Discovery" (icon info)
- Dòng "Iteration hiện tại: 47 / 500" + thanh progress bar
- Dòng "Đã kiểm tra: 2,350 candidates"
- Dòng "Best strategy so far": chip "MA + RSI + S/R"
- Dòng "Profit: +2,342.18 USDT" và "Winrate: 68.21%"

---

## Màn hình 4: Backtest & Kết quả giao dịch (`4-Backtest.jpg`)

- Dòng mô tả phụ: "Chọn coin, thời gian test, vốn, strategy và đánh giá hiệu quả"

### Thanh cấu hình trên cùng (7 trường)
- Dropdown "Pair / Coin" (BTCUSDT, icon coin)
- Dropdown "Timeframe" (5m)
- Date picker "From date" (01/05/2025)
- Date picker "To date" (15/05/2025)
- Input "Vốn (USD)" (100, đơn vị USD)
- Dropdown "Strategy" (MA Crossover)
- Input "Transaction Cost" (0.08, đơn vị %)
- Input "Slippage" (5, đơn vị bps)

### Khối biểu đồ Backtest (trái)
- Tiêu đề "Biểu đồ Backtest (BTCUSDT · 5m)" + icon phóng to toàn màn hình (fullscreen)
- Chú thích trên biểu đồ: MA(20) giá trị, MA(50) giá trị, Hỗ trợ giá trị, Kháng cự giá trị
  (mỗi mục có chấm màu tương ứng)
- Biểu đồ nến (candlestick) với:
  - Đường MA(20) và MA(50) chồng lên
  - Đường kẻ ngang đứt nét đỏ "Kháng cự" và nhãn giá
  - Đường kẻ ngang đứt nét xanh "Hỗ trợ" và nhãn giá
  - Nhãn/marker "SHORT Entry" (mũi tên đỏ trỏ xuống tại điểm vào lệnh)
  - Nhãn/marker "LONG Entry" (mũi tên xanh trỏ lên tại điểm vào lệnh)
  - Nhãn "Take Profit" (đường đứt nét)
  - Nhãn "Stop Loss" (đường kẻ ngang đứt nét đỏ, có nhãn giá trị)
  - Marker "Exit" (chấm tròn xanh dương + nhãn) tại điểm thoát lệnh
- Trục giá bên phải, trục thời gian bên dưới
- Biểu đồ Volume dạng cột bên dưới candlestick

### Khối "Danh sách lệnh giao dịch" (phải)
- Bảng gồm cột: #, Pair/Coin, Thời gian vào lệnh, Hướng (badge LONG xanh / SHORT đỏ), Giá
  vào, Stoploss, TakeProfit, Giá kết thúc, Phí, Slippage, Profit (USD) (màu xanh/đỏ theo
  lãi/lỗ)
- 10 dòng dữ liệu mẫu
- Dropdown "Hiển thị" số dòng/trang (10)
- Text "1–10 của 178 lệnh"
- Phân trang: nút prev (‹), số trang 1 (active) 2 3 … 18, nút next (›)

### Hàng thẻ chỉ số tổng kết (metric cards) bên dưới biểu đồ
- "Winrate": 61.80% + text "110/178" + mini pie chart (xanh/xám)
- "Wins": 110 + text "Tổng lệnh thắng"
- "Losses": 68 + text "Tổng lệnh thua"
- "Total Profit": +8.42 USD + "+8.42%" + mini sparkline tăng dần (xanh)
- "Max Drawdown": -3.21 USD + "-3.21%" + mini sparkline giảm (đỏ)
- "Total Trades": 178 + "100%" + mini bar chart

### Khối "Cách tính Profit"
- Công thức trực quan dạng icon nối bằng dấu toán học: $ (Gross Profit - Tổng lãi/lỗ trước
  phí) − % (Fee - Phí giao dịch (0.08%)) − bps (Slippage - Trượt giá (5 bps)) = $ (Net
  Profit - Lợi nhuận ròng thực tế)

### Khối "Giả định Backtest"
- Danh sách checklist (dấu tick xanh):
  - Hỗ trợ cả LONG và SHORT
  - Xử lý SL/TP theo giá thực tế (OHLC)
  - Kết quả có thể tái lập (reproducible)

---

## Màn hình 5: News Crawler & Phân tích thị trường (`5-NewsCrawler.jpg`)

- Dòng mô tả phụ: "Thu thập tin tức, hiểu HTML bằng LLM, lưu template và phân tích
  sentiment"

### Thanh cấu hình trên cùng
- Label "Nguồn" + nhóm nút chọn nguồn: "🌐 Website" (đang active), "📡 RSS", "</> HTML"
- Dropdown "Pair (Asset)": BTC, ETH, SOL
- Label "Auto refresh" + nhóm nút chọn chu kỳ: 1 phút (active), 2 phút, 3 phút, 4 phút,
  5 phút
- Nút "⚙ Cấu hình nguồn" (outline)
- Nút "▷ Bắt đầu crawl" (nút chính, xanh dương)

### Cột 1: "Tin tức đầu vào"
- Trạng thái "⟳ Cập nhật: 10:45:18"
- Bảng/cột dữ liệu: Asset (icon coin), Tiêu đề (kèm đoạn tóm tắt/snippet phía dưới), Nguồn
  (VD: CoinDesk, The Block, Decrypt, Cointelegraph, Bankless, The Defiant), Thời gian
- 6 dòng tin tức mẫu
- Link "Xem tất cả tin tức →"

### Cột 2 (trên): "LLM-assisted Extraction"
- Badge "Template: v1.4.2" kèm dấu tick
- Sơ đồ quy trình 4 bước dạng pipeline ngang, mỗi bước có icon số thứ tự tròn + tên + mô
  tả, nối bằng mũi tên:
  1. HTML thô — "Thu thập nội dung HTML từ nguồn"
  2. LLM hiểu tag HTML — "LLM đọc & hiểu cấu trúc, nhận diện vùng nội dung"
  3. Sinh Extraction Template — "Tạo template trích xuất được đề xuất"
  4. Lưu version template — "Lưu lại và quản lý các phiên bản"
- 4 khối preview nội dung tương ứng từng bước:
  - Đoạn code HTML mẫu (thẻ html/head/body/div/h1/p/span/time)
  - Khối "Nhận diện vùng": mapping field → selector (title→h1, summary→p.class,
    source→span.class, time→time, asset→context)
  - Khối JSON preview: title, summary, source, time, asset + dòng "Fields: 5 | Score: 0.92"
  - Khối "Các phiên bản": danh sách version template (v1.4.2 hiện tại kèm badge, v1.4.1,
    v1.4.0) mỗi dòng có timestamp, link "Xem tất cả"
  - Dòng "Độ tin cậy: 0.92" ở khối JSON

### Cột 2 (dưới): "Self-healing extraction"
- Toggle "Tự động bật" (đang ON)
- Sơ đồ quy trình 4 bước dạng pipeline ngang tương tự, nối bằng mũi tên và một nhánh rẽ
  (diamond decision):
  1. Validate kết quả — "Kiểm tra chất lượng kết quả trích xuất"
  2. Lỗi cao? — "Nếu lỗi > ngưỡng (VD: 10%)"
  3. LLM sửa template — "LLM phân tích lỗi & đề xuất template mới"
  4. Lưu version mới — "Lưu và chuyển sang version mới"
- Khối "Chỉ số hiện tại": Fields rỗng 8.7%, Sai định dạng 3.2%, Độ tin cậy TB 0.76, Tổng
  lỗi 11.9%
- Hình thoi quyết định "Lỗi cao?" với 2 nhánh: "Không" và "Có"
- Khối "Đề xuất template mới": v1.4.3 (draft), "Giảm lỗi dự kiến: 11.9% → 4.1%", "Độ tin
  cậy dự kiến: 0.93", nút "Xem diff"
- Khối "Đã lưu thành công": v1.4.3, timestamp "10:45 · 18/05/2025", nút "Áp dụng ngay"

### Cột 3: "Đầu ra phân tích"
- Trạng thái "⟳ Cập nhật: 10:45"
- Khối "Sentiment tổng hợp (24h)": thanh stacked bar (xanh/xám/đỏ) + chú thích Positive
  58%, Neutral 27%, Negative 15%
- Khối "Event Type (Top)": các badge/tag kèm %: ETF/Fund Flow 28%, Protocol Upgrade 22%,
  Regulation 15%, Partnership 12%, Market Trend 23%
- Dòng "Confidence Score (TB)": 0.78
- Dòng "Số lượng tin đã phân tích (24h)": 1,248
- Dòng "Độ bao phủ nguồn": 92% + thanh progress bar + text "23/25"

### Khối "Tích hợp với Strategy"
- Mô tả: "News Sentiment được sử dụng trong Strategy Engine"
- Sơ đồ luồng: icon "News Sentiment (Real-time)" → mũi tên nhãn "API/Stream" → icon
  strategy engine (không rõ/khó đọc nhãn icon giữa, chữ bị mờ) → mũi tên nhãn "Hoặc sử
  dụng trực tiếp" → khối "⚡ NewsSentimentStrategy (Chiến lược mẫu)"
