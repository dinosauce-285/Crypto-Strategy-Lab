# Kiến trúc Hệ thống (Architecture)

Một người dùng mở ứng dụng để trả lời duy nhất một câu hỏi: *Tổ hợp quy tắc giao dịch nào mang lại lợi nhuận trên đoạn thị trường này, và làm sao để tôi kiểm chứng được điều đó?* Mọi thành phần trong hệ thống này tồn tại để trả lời câu hỏi đó một cách rõ ràng và có thể tái kiểm chứng — một biểu đồ trực quan để quan sát, một bộ quy tắc để lắp ráp, một mô phỏng không bao giờ nhìn trộm dữ liệu tương lai (zero lookahead), một điểm số đánh giá khách quan, và một vòng lặp liên tục thử nghiệm các tổ hợp trong lúc người dùng theo dõi.

Do đó, những gì đang được xây dựng ở đây **không phải là một trading bot**. Đây là một **phòng thí nghiệm (laboratory)**, và tiêu chí được dùng để đánh giá hệ thống là: *cần phải thay đổi ít đến mức nào khi có một ý tưởng mới xuất hiện*. Thêm một chiến lược mới chỉ là thêm một file duy nhất và một dòng đăng ký trong danh sách. Thêm một sàn giao dịch mới chỉ là cài đặt một adapter đứng sau một interface cổng (port). Ràng buộc này chính là lý do tồn tại của hầu hết các đường ranh giới (seams) được mô tả bên dưới, và cũng là lý do vì sao một số giải pháp được chọn có chi phí ban đầu cao hơn các giải pháp hiển nhiên khác.

Lý do chi tiết cho từng lựa chọn kỹ thuật được lưu trong thư mục [`decisions/`](decisions/) và được dẫn link trực tiếp, không nhắc lại dông dài. Các hợp đồng hành vi được lưu tại [`../openspec/specs/`](../openspec/specs/).

---

## 1. Ngữ cảnh Hệ thống (System Context)

```
                        ┌──────────────────────────┐
       Người dùng ─────►│   Crypto Strategy Lab    │
       trên trình duyệt │                          │
                        └───┬───────┬──────────┬───┘
                            │       │          │
              Klines + Live │       │ Bài báo  │ Phân loại văn bản
                  Trades    │       │          │
                            ▼       ▼          ▼
                         Binance   CryptoCompare   Groq
                                   + RSS feeds   (mô hình hosted)
```

Bốn thực thể nằm bên ngoài ranh giới hệ thống, và mỗi thực thể đều được tiếp cận thông qua một interface do chính hệ thống sở hữu thay vì gọi trực tiếp SDK của bên thứ ba:

- **Binance** — thị trường giao dịch. Khớp lệnh thời gian thực (live trades) và nến đã đóng (closed candles) truyền qua WebSocket, dữ liệu nến lịch sử truyền qua REST. Nằm sau hai interface `ExchangeStreamPort` và `ExchangeHistoryPort` ([0027](decisions/0027-the-historical-adapter-sits-behind-exchangehistoryport.md)), do đó từ khóa *Binance* chỉ xuất hiện trong đúng hai file adapter và tuyệt đối không xuất hiện ở bất kỳ nơi nào khác.
- **Nhà cung cấp tin tức (News providers)** — API của CryptoCompare và danh sách các nguồn cấp RSS feeds, cả hai đều đứng sau interface `NewsProvider` ([0031](decisions/0031-news-collector-multi-provider-architecture.md)). Một nguồn cấp tin gặp sự cố chỉ làm mất các bài báo của riêng nguồn đó và không ảnh hưởng đến bất kỳ thành phần nào khác.
- **Groq** — mô hình ngôn ngữ được host trên đám mây để gán nhãn bài báo là tích cực (positive), tiêu cực (negative) hoặc trung tính (neutral), đứng sau interface `SentimentProvider` ([0005](decisions/0005-sentiment-via-groq.md)). Khi không cấu hình API key, module sẽ tự động chuyển sang cơ chế heuristic dựa trên từ khóa (keyword heuristic), đảm bảo phần còn lại của hệ thống vẫn hoạt động bình thường.
- **Trình duyệt (The browser)** — client duy nhất của hệ thống. Trình duyệt chỉ hiển thị (render) và không bao giờ tính toán logic: không tính toán lợi nhuận, không tính điểm xếp hạng, không sinh tín hiệu giao dịch (`AGENTS.md`, quy tắc bất khả xâm phạm số 5).

Postgres và Redis không phải là các tác nhân (actors) bên ngoài trong sơ đồ này. Chúng là tài nguyên nội bộ của hệ thống và sẽ xuất hiện trong sơ đồ phân rã tiếp theo.

## 2. Phân rã Container và Module (Container and module decomposition)

Ba tiến trình độc lập, một kho mã nguồn duy nhất, một package định nghĩa kiểu dữ liệu dùng chung.

```
┌────────────┐   HTTP /api        ┌──────────────────────────────┐
│  apps/web  │◄──────────────────►│          apps/api            │
│ React+Vite │   socket /channel  │  Nest — HTTP + kênh push     │
└────────────┘◄───────────────────└──────┬───────────────┬───────┘
                                         │               │
                                     Postgres          Redis
                                     (Prisma 7)      (Hàng đợi BullMQ)
                                         │               │
                                         │        ┌──────▼────────┐
                                         └────────┤ pnpm worker   │
                                                  │ N tiến trình, │
                                                  │ không mở HTTP │
                                                  └───────────────┘

           packages/contracts  — các kiểu dữ liệu cả hai bên cùng import, không bên nào sở hữu riêng
```

Tiến trình worker sử dụng cùng mã nguồn backend nhưng khởi động từ một root module khác (`BacktestWorkerModule` — không có HTTP controllers, không có WebSocket gateway) và được tách thành tiến trình độc lập có chủ đích: kiểm thử backtest là tác vụ ngốn CPU (CPU-bound), nếu chạy chung trong tiến trình API sẽ làm nghẽn chính kết nối WebSocket dùng để đẩy tiến độ về cho giao diện ([0004](decisions/0004-bullmq-for-backtests.md)). Đánh đổi cho việc này là phải thêm hàng đợi, thêm phụ thuộc vào Redis, và bản đặc tả ứng viên (candidate spec) bắt buộc phải tuần tự hóa (serialize) được ([0007](decisions/0007-candidate-as-spec.md)).

Bên trong API, các module NestJS **chính là** kiến trúc hệ thống. Một module chỉ có thể truy cập những gì mà module khác export ra, do đó quy tắc phụ thuộc một chiều được thực thi bởi chính framework thay vì phụ thuộc vào việc review code thủ công:

```
   market ────────────┐
   ranking ───────────┼──────►  realtime   (ChannelPublisher, TopicAudience)
   search ────────────┘
      │
      ├──►  market       dữ liệu nến và cơ chế nạp bù lưu trữ (backfill)
      ├──►  strategy     bộ đăng ký (registry) và xưởng khởi tạo (factory)
      ├──►  indicator    module duy nhất import indicator — indicator không nằm trong app.module
      └──►  evaluation   EvaluatorPort

   news ──news.collected──► sentiment ──news.sentiment.analyzed──► indicator
```

Các mũi tên chỉ chiều phụ thuộc (imports). Tuyệt đối không có thành phần phía sau nào vươn ngược lại phía trước: một chiến lược không thể nhìn thấy database, bộ chạy backtest không thể nhìn thấy trình duyệt, và `news` cùng `sentiment` không bao giờ import lẫn nhau — chúng gặp nhau thông qua sự kiện trên event bus ([0003](decisions/0003-in-process-event-bus.md)), giúp tách biệt hoàn toàn module thu thập tin tức khỏi mô hình AI. Module `indicator` chỉ được tiếp cận thông qua `search`, đảm bảo chỉ có tác vụ backtest mới có quyền yêu cầu chuỗi chỉ báo kỹ thuật.

Có một tham chiếu đi ngược chiều mũi tên có chủ đích: `strategy` cài đặt token `StrategyFactory` được khai báo trong `search/ports/`. Bên gọi sở hữu hợp đồng (contract), bên plugin cung cấp bản cài đặt thực thi (implementation) — nếu không làm vậy, search sẽ phải import strategy chỉ để định danh thứ nó cần.

Mọi thứ trình duyệt tương tác đều nằm dưới tiền tố `/api`, và bất kỳ lỗi nào đi qua ranh giới đó đều mang mã trạng thái HTTP riêng: một lớp con của `DomainError` sẽ khai báo mã HTTP và một filter toàn cục duy nhất sẽ chuyển nó thành phản hồi client ([0044](decisions/0044-domain-errors-carry-their-http-status-and-a-global-filter-ma.md)). Thiếu Redis trả về 503, không tìm thấy dataset trả về 404, đặc tả sai cú pháp trả về 400 — mỗi lỗi đều kèm thông điệp rõ ràng để người dùng xử lý.

`realtime` là module duy nhất mà hầu hết các module khác đều trỏ đến, và nó export hai abstraction (`ChannelPublisher`, `TopicAudience`) thay vì export trực tiếp gateway ([0020](decisions/0020-module-reaches-the-browser-through-ports.md)). Một module muốn đẩy dữ liệu chỉ phụ thuộc vào *khả năng đẩy dữ liệu*, không phụ thuộc vào Socket.IO.

## 3. Trách nhiệm của từng Thành phần (Component responsibilities)

Mỗi thành phần được định nghĩa trong đúng một dòng. Nếu một thành phần cần hai dòng để mô tả, nghĩa là nó đang làm hai việc cùng lúc.

- **market** — cung cấp dữ liệu nến. `GET /api/market/candles` không kèm khoảng thời gian sẽ đọc trực tiếp lịch sử nến gần nhất từ Binance ([0040](decisions/0040-realtime-watched-candles-are-read-live-from-the-exchange-not.md)). `MarketService` duy trì một kết nối theo dõi (watch) cho mỗi cặp coin, khởi tạo con trỏ kết nối lại bằng một cây nến gần nhất từ sàn, tự động kết nối lại và tự bù đắp khoảng trống dữ liệu khi rớt mạng ([0032](decisions/0032-server-owned-reconnect-and-gap-backfill.md)). Việc theo dõi là tạm thời: Realtime chỉ phát các nến đã đóng và không lưu trữ chúng vào DB. Việc tạo dataset sẽ gọi API lấy và lưu trữ riêng khoảng lịch sử nến theo từng trang phân trang ([0041](decisions/0041-dataset-creation-fetches-and-stores-its-own-candle-range-fro.md)), đảm bảo các lượt backtest đọc một tập dữ liệu cố định có tính lặp lại (reproducible).
- **indicator** — chuyển đổi các cây nến thành các con số chỉ báo: Moving Average (MA), MACD, RSI, Bollinger Bands, các vùng hỗ trợ/kháng cự (Support & Resistance zones), và chuỗi tâm lý tin tức (sentiment series). Mọi bộ tính toán đều tuân thủ luật nhân quả nghiêm ngặt (strictly causal), và giá trị sẽ để trống (absent) thay vì ước lượng xấp xỉ cho đến khi đủ số lượng nến tối thiểu ([0028](decisions/0028-indicator-series-are-named-by-dotted-source-one-field-per-da.md), [0029](decisions/0029-support-resistance-zones-come-from-causally-confirmed-cluste.md)). Kết quả tính toán được cache theo từng dataset, loại chỉ báo và tham số, vì một search run sẽ gọi lại cùng một chuỗi chỉ báo hàng nghìn lần.
- **strategy** — điểm cắm ghép plugin (plugin point). `StrategyRegistry` lưu trữ bảy chiến lược đã đăng ký theo khóa `id@version` và ghi nhận chúng vào database lúc khởi động; `StrategyFactory` chuyển một bản đặc tả thành một đối tượng thực thi được. Một chiến lược chỉ chứa duy nhất logic giao dịch: đọc context đầu vào, trả về tín hiệu `BUY`/`SELL`/`HOLD` kèm độ mạnh (strength) ([0006](decisions/0006-signal-carries-strength.md)), và tuyệt đối không tự tính toán lợi nhuận.
- **search** — vòng lặp tìm kiếm và cơ chế vận hành: các bộ sinh ứng viên (candidate generators), hàng đợi, bộ chạy duyệt nến theo thời gian, các dataset dùng để đánh giá ứng viên, và luồng chạy đơn lẻ mà màn hình Backtest sử dụng.
- **evaluation** — chấm điểm các giao dịch thành các chỉ số hiệu suất: tổng lợi nhuận (total return), lời lỗ (PnL), tỷ lệ thắng (win rate), số lượng giao dịch, sụt giảm tài khoản tối đa (Max Drawdown - MDD), hệ số lợi nhuận (profit factor), chỉ số Sharpe ([0035](decisions/0035-metric-evaluation-formulas-for-profit-calculation-modes-draw.md)). Module này tách biệt hoàn toàn khỏi bộ chạy backtest vì thành phần sinh ra kết quả không được phép là thành phần chấm điểm cho chính nó.
- **ranking** — tính toán lại bảng xếp hạng (leaderboard) trên mỗi lượt đọc thay vì lưu trữ cố định vào DB ([0011](decisions/0011-leaderboard-is-recomputed.md)), áp dụng công thức tính điểm tổng hợp kèm cơ chế giảm chấn theo số lượng giao dịch (trade-count damping) ([0036](decisions/0036-overall-score-formula-and-trade-count-damping-for-leaderboar.md)). Bảng xếp hạng lưu trữ sẵn chỉ là một lớp cache dễ bị sai lệch ngay khoảnh khắc một lượt chạy vừa kết thúc.
- **news** — thu thập bài báo từ mọi nhà cung cấp tin, loại bỏ trùng lặp theo URL, phát sự kiện `news.collected`. Module này hoàn toàn không biết đến sự tồn tại của sentiment.
- **sentiment** — lắng nghe sự kiện `news.collected`, phân loại bài báo, lưu nhãn (label) và điểm số (score). Một bài báo mà nhà cung cấp AI không thể phân loại sẽ giữ nguyên trạng thái chưa chấm điểm để thử lại sau; tuyệt đối không gán nhãn giả trung tính (neutral), bởi vì "chưa biết" và "trung tính" là hai sự thật hoàn toàn khác nhau.
- **realtime** — một kênh Socket.IO duy nhất tại endpoint `/channel`, phân định theo chủ đề (topic) ([0017](decisions/0017-one-push-channel-addressed-by-topic.md), [0019](decisions/0019-the-push-channel-runs-on-socket-io.md)). Một client xem 4 biểu đồ cùng lúc chỉ giữ đúng một kết nối mạng và 4 lượt đăng ký topic.

## 4. Luồng Dữ liệu (Data Flow)

Hệ thống chỉ có bảy bảng trong cơ sở dữ liệu, và hai bảng *không tồn tại* lại nói lên nhiều điều nhất: Không có bảng `Leaderboard` — vì nó luôn được tính toán lại trực tiếp. Không có bảng `Signal` — vì tín hiệu chỉ là một giá trị thoáng qua trong một lượt chạy, không phải là một bản ghi lưu trữ vĩnh viễn.

```
Candle ──┐                     Dataset ◄──── Các quy tắc đánh giá của một lượt chạy
         │                        │  ▲
         │                        │  └──── DatasetLease ◄── Một lượt backtest đang thực thi
         └──► Backtest đọc ───────┤
                                  ▼
                             Experiment ──► Trade
                             (lưu spec dưới dạng JSON,
                              các chỉ số metrics là các cột)

Strategy   Chỉ ghi thêm (append-only) trên (id, version)      News   Bài báo + điểm sentiment
```

Bảng `Experiment` lưu trữ toàn bộ công thức cấu hình dưới dạng JSON thay vì chỉ lưu tên chiến lược, nhờ đó một kết quả tìm thấy từ nhiều tháng trước vẫn có thể tái hiện lại chính xác từ chính dòng dữ liệu của nó ([0007](decisions/0007-candidate-as-spec.md)). Các chỉ số hiệu suất là các cột riêng biệt thay vì gom vào blob JSON để bảng xếp hạng có thể sắp xếp trực tiếp qua SQL. Bảng `Strategy` là bảng chỉ ghi thêm (append-only) trên cặp khóa `(id, version)`: một thử nghiệm cũ bắt buộc phải luôn truy vết được đúng phiên bản mã nguồn đã tạo ra nó ([0009](decisions/0009-strategy-versioning.md)).

Bảng `Dataset` tồn tại dưới dạng một dòng dữ liệu thay vì các tham số truy vấn (query parameters) bởi vì nó mang theo *các quy tắc phán quyết (judging rules)* — giá vào lệnh, tỷ lệ phí, thời gian warm-up, chế độ tính lợi nhuận, chế độ tính drawdown ([0010](decisions/0010-dataset-carries-the-backtest-rules.md)). Thay đổi một quy tắc đồng nghĩa với việc tạo ra một dataset mới chứ không sửa dataset cũ, nhờ đó các kết quả cũ luôn giữ nguyên giá trị trong thế giới mà chúng được đo lường. Đó cũng là yếu tố giúp bảng xếp hạng trở nên có ý nghĩa: mọi ứng viên trên bảng đều được đánh giá theo cùng một chuẩn mực.

`DatasetLease` là một dòng trong database thay vì một khóa lock giữ trong bộ nhớ RAM, bởi vì đối tượng mà nó bảo vệ nằm trong cơ sở dữ liệu còn đối tượng nắm giữ khóa lại nằm trong một tiến trình worker khác ([0049](decisions/0049-active-backtests-hold-a-durable-dataset-lease.md)). Một lượt backtest sẽ lấy lease trước khi đọc bất kỳ dữ liệu nào, gia hạn lease mỗi phút một lần, và xóa lease trong khối `finally`. Khóa ngoại được cấu hình `ON DELETE RESTRICT`, do đó hành động xóa dataset trong khi có backtest đang chạy sẽ bị chặn lại ngay từ tầng database thay vì làm backtest gãy giữa chừng. Việc ghi nhận kết quả experiment sẽ gia hạn lease ngay trong câu lệnh đầu tiên của transaction, và nếu lease đã biến mất thì toàn bộ transaction sẽ rollback: một kết quả được ghi nhận cho một dataset không còn tồn tại thì tệ hơn là không có kết quả nào.

Các module không bao giờ gọi trực tiếp nhau để phát thông báo. Chín sự kiện nội bộ đảm nhận việc này (`packages/contracts/src/events.ts`), và payload chỉ mang theo các mã định danh thay vì toàn bộ đối tượng khi bên nhận có thể tự đọc được — sự kiện `leaderboard.updated` chỉ thông báo bảng nào vừa thay đổi, không gửi kèm nội dung bảng, vì bảng xếp hạng luôn được tính toán lại và nếu gửi dữ liệu đi thì nó sẽ bị cũ (stale) ngay khi đến nơi.

## 5. Luồng Thời gian thực (Realtime Flow)

Server chủ động đẩy dữ liệu (push); trình duyệt tuyệt đối không polling (`AGENTS.md`, quy tắc bất khả xâm phạm số 6).

```
Binance REST ──► GET /api/market/candles ──► Lịch sử nến gần nhất hiển thị trên trình duyệt
                                                (không lưu vào database)

Binance WS ──► BinanceStreamAdapter ──► MarketService
                                            │
                            ┌───────────────┴───────────────┐
                            ▼                               ▼
                     channel.publish                   Event bus:
                     market:BTCUSDT:1m                 candle.closed
                            │
                            ▼
                     Trình duyệt đã subscribe topic tương ứng
```

Màn hình lấy lịch sử nến ban đầu thông qua `GET /api/market/candles` không truyền `from`/`to`, endpoint này sẽ đọc các nến gần nhất trực tiếp từ Binance. Một lượt đăng ký (subscription) sẽ kích hoạt luồng streaming: `TopicAudience` thông báo rằng một topic vừa có người theo dõi đầu tiên, `MarketService` sẽ mở kết nối upstream đến Binance và khởi tạo con trỏ kết nối lại bằng một cây nến gần nhất từ sàn. Khi người theo dõi cuối cùng rời đi, kết nối sẽ tự động đóng lại. Không bao giờ stream dữ liệu của một cặp coin mà không có ai đang nhìn, và việc theo dõi realtime không bao giờ ghi nến vào cơ sở dữ liệu.

Việc tự động kết nối lại khi mất mạng là trách nhiệm của server, không phải của trình duyệt ([0032](decisions/0032-server-owned-reconnect-and-gap-backfill.md)). Khi kết nối socket bị đứt, service sẽ tự động kết nối lại, gọi API Binance lấy bù khoảng nến bị trống kể từ con trỏ lưu trữ, và đẩy các nến đóng đã phục hồi cùng nến trong bộ đệm ra ngoài theo đúng thứ tự thời gian. Trình duyệt chỉ nhận thấy một độ trễ nhỏ chứ không hề bị khuyết dữ liệu — và trình duyệt không bao giờ phải bận tâm đến việc kết nối với sàn giao dịch từng bị gián đoạn.

## 6. Luồng Chiến lược (Strategy Flow)

Thêm một chiến lược mới chỉ là thêm một file duy nhất và một dòng đăng ký trong `registered-strategies.ts` ([0033](decisions/0033-strategies-are-registered-explicitly.md)). Không có bất kỳ thành phần nào khác phải thay đổi: không phải sửa bộ kết hợp, không phải sửa không gian tìm kiếm, không phải sửa bộ backtest, không phải sửa giao diện người dùng.

```
StrategyRegistration { meta, create(params) }
        │
        │  Registry liệt kê nó ──► Bộ chọn (picker) trên giao diện
        │                      └──► Không gian tìm kiếm (search space)
        ▼
CandidateSpec { members: [{ id, version, params, weight }], threshold }
        │
        ▼
StrategyFactory.build ──► WeightedRunnableStrategy
                               │
                               │  analyze(context)
                               ▼
                    Σ (direction × strength × weight)
                               │
                    > threshold → BUY   < −threshold → SELL   khác → HOLD
```

Một tổ hợp chiến lược là một cuộc bỏ phiếu có trọng số (weighted vote) và chỉ duy nhất như vậy ([0014](decisions/0014-weighted-merge-only.md)). Phương án thay thế — cho phép các tổ hợp tự định nghĩa logic kết hợp tùy ý — có thể tăng tính linh hoạt nhưng sẽ phá vỡ tiêu chí cốt lõi của đồ án: khoảnh khắc việc kết hợp trở thành code tùy biến thì việc thêm một chiến lược mới sẽ không còn là một file duy nhất nữa.

Cơ chế đăng ký registry là tường minh (explicit) thay vì tự động quét thư mục (auto-discovery). Quét thư mục có thể ngắn hơn một dòng code nhưng sẽ làm danh sách chiến lược phụ thuộc vào trạng thái hệ thống file lúc chạy, vốn không phải là thứ mà người đọc code có thể kiểm tra một cách minh bạch.

Những gì một chiến lược được phép nhìn thấy là một đối tượng `StrategyContext`: các cây nến tính đến thời điểm hiện tại (index hiện tại) và hàm tra cứu chỉ báo kỹ thuật. Nó không thể nhìn thấy cây nến `i+1`, không thể chạm vào database, và không thể phát thông báo tới trình duyệt — ba điều bất khả thi về mặt kiến trúc thay vì chỉ là ba lời nhắc nhở.

## 7. Luồng Tìm kiếm và Kiểm thử Lịch sử (Search / Backtest Flow)

Vòng lặp tìm kiếm bắt buộc phải dừng, và phải dừng vì một lý do đã được thiết lập từ trước khi bắt đầu ([0021](decisions/0021-a-search-run-declares-its-bound-before-it-starts.md)). Một yêu cầu tìm kiếm không khai báo giới hạn (bound) sẽ bị từ chối ngay lập tức với mã lỗi HTTP 400. Do đó, "hệ thống này không thể chạy một vòng lặp vô tận" là một thuộc tính cứng của API, không phải là một quy ước phụ thuộc vào thói quen của lập trình viên.

```
POST /api/search/runs  { datasetId, strategyRefs, bound, mode }
        │
        ▼
   SearchService ── kích hoạt định kỳ mỗi 500ms ────────────────┐
        │                                                       │
        │ nạp hàng đợi tối đa 50 phần tử, không vượt ngân sách   │
        ▼                                                       │
   CandidateSource ──► random | domain-guided | genetic          │
        │                                                       │
        │                                                       │
        ▼                                                       │
   BullMQ (Redis) ──────────────────────────────────────────┐   │
                                                            ▼   │
                                        ┌── Tiến trình worker ──┴──┐
                                        │  BacktestProcessor        │
                                        │   kiểm tra tính hợp lệ    │
                                        │   bỏ qua nếu đã từng chạy │
                                        │   lấy lease trên dataset  │
                                        │   StrategyFactory.build   │
                                        │   BacktestRunner.run      │
                                        │   chấm điểm các giao dịch │
                                        │   ghi Experiment+Trades   │
                                        │   giải phóng lease        │
                                        └───────────┬───────────────┘
                                                    │ kết quả job
        ┌───────────────────────────────────────────┘
        ▼
   SearchService cập nhật các bộ đếm ──► search:<runId> ──► Trình duyệt
```

Một tiến trình chạy (run) chọn một bộ sinh ứng viên (generator) và giữ nguyên nó trong suốt quá trình. Chế độ tìm kiếm di truyền (genetic mode) tận dụng khả năng mà ADR `0013` và `0037` để ngỏ: nó lai tạo các ứng viên tiếp theo từ những cá thể đạt điểm cao nhất mà lượt chạy đã tìm ra, trong khi chế độ ngẫu nhiên (random) và định hướng miền (domain-guided) đọc lịch sử đó chỉ nhằm tránh thử lại các cấu hình trùng lặp ([0050](decisions/0050-a-genetic-search-mode-breeds-candidates-from-the-search-run.md)).

Sáu điều kiện có thể kết thúc một lượt tìm kiếm: hết ngân sách ứng viên (candidate budget), hết thời lượng đồng hồ đếm ngược (wall-clock duration), đạt ngưỡng bão hòa (plateau) khi kết quả không còn cải thiện, bộ sinh cạn kiệt không gian tham số, người dùng bấm nút dừng (stop), hoặc trạng thái tạm dừng (pause) kéo dài quá 30 phút. Bất kể điều kiện nào kích hoạt cũng đều được ghi nhận vào cơ sở dữ liệu, vì một lượt chạy chỉ hiển thị trạng thái chung chung "không chạy" sẽ không thể phân biệt được với một tiến trình bị crash đột ngột.

Điều kiện cuối cùng trong sáu điều kiện trên tồn tại là vì điều kiện thứ hai. Một lượt chạy bị tạm dừng sẽ không tiêu tốn ngân sách thời gian — giới hạn thời lượng chỉ đếm thời gian đang kích hoạt thực tế ([0045](decisions/0045-a-paused-run-stops-spending-its-budget-and-holds-a-lease-ins.md)) — điều này biến trạng thái tạm dừng thành một dạng "giữ chỗ" có thời hạn (lease) thay vì một trạng thái treo vô tận: không có lượt chạy nào khác có thể bắt đầu trong khi khóa này đang được giữ, do đó nó bắt buộc phải tự động hết hạn khi bị bỏ quên.

Bên trong một lượt backtest đơn lẻ, tính nhân quả (causality) là yếu tố quyết định hàng đầu. Bộ chạy duyệt nến tịnh tiến về phía trước và cung cấp cho chiến lược một context chỉ cắt đến cây nến hiện tại. Dưới quy tắc `next-open`, một tín hiệu phát ra ở cây nến `i` sẽ được khớp lệnh tại giá mở cửa của nến `i+1`; dưới quy tắc `signal-close`, lệnh được khớp tại giá đóng cửa của chính cây nến đó. Phí giao dịch được trừ ở cả hai chiều mua và bán. Cùng một bản đặc tả chạy trên cùng một dataset chỉ được tạo ra một bản ghi experiment duy nhất, được đảm bảo bằng unique index trong database thay vì dựa vào việc lập trình viên có nhớ kiểm tra hay không.

Một thất bại luôn được ghi lại thành văn bản thay vì chỉ ghi log console: một đặc tả sai cấu trúc, một chiến lược không tồn tại hoặc một dataset bị thiếu sẽ kết thúc job ngay ở lần thử đầu tiên thay vì retry đâm đầu vào cùng một bức tường, và dòng dữ liệu lưu lại đó chính là nguồn để hiển thị số lượng job thất bại trên giao diện người dùng.

---

## Những điểm thực tế trong code cần lưu ý

Một tài liệu kiến trúc trung thực phải nêu rõ cả những điểm mà hệ thống hiện tại đang xử lý thực tế hoặc các chi tiết kỹ thuật cần lưu ý thay vì chỉ vẽ ra mô hình lý tưởng trên giấy.

Hai ranh giới kỹ thuật trước đây đã được hoàn thiện triệt để: port evaluator trùng lặp mà luồng hàng đợi từng đòi hỏi (`docs/decisions/0042`), và sự kiện `experiment.completed` của leaderboard — một tên sự kiện nằm ngoài contract do luồng chạy đơn lẻ phát ra khiến bảng xếp hạng bị đứng im trong lúc search. Hiện tại controller đã lắng nghe đúng ba sự kiện chuẩn trong contract và luồng worker phát ra hai trong số đó.

Những điểm kỹ thuật còn lại có quy mô nhỏ hơn, và rất đáng ghi nhận lại để tránh hiểu nhầm khi đọc code:

**Một trong ba sự kiện chỉ phát ra từ một luồng duy nhất.** Sự kiện `leaderboard.updated` phát ra từ service chạy đơn lẻ và không phát ra ở nơi nào khác, do đó một lượt chạy đơn lẻ sẽ đánh thức listener ba lần trong khi một ứng viên từ hàng đợi đánh thức hai lần. Payload ở đây là tín hiệu báo làm mới (invalidation ping) chứ không mang dữ liệu thô, nên các khung hình dư thừa chỉ tốn thêm một lượt truy vấn lại chứ không làm sai lệch số liệu — tuy nhiên việc có tới ba tên sự kiện cho cùng một mục đích là điểm có thể tối ưu thêm.

**Thuộc tính `Dataset.to` là biên mở (exclusive) trong schema nhưng lại lấy bao gồm (inclusive) trong bộ đọc.** Cột dữ liệu được tài liệu hóa là cận trên loại trừ (exclusive bound), nhưng câu lệnh truy vấn khoảng nến lại dùng `openTime <= to`. Một cây nến rơi đúng vào mốc biên về mặt thực tế sẽ nằm bên trong dataset nhưng trên lý thuyết lại nằm ngoài, và vì định danh của một dataset dựa trên khóa tổ hợp 9 cột nên việc chốt theo hướng nào cũng sẽ ảnh hưởng đến tập các dòng nến mà dataset hiện tại bao phủ.

**Hai chỉ số đọc dữ liệu giao dịch có sự khác biệt nhỏ về cách dự phòng.** Tổng lợi nhuận (total return), lời lỗ (PnL), mức sụt giảm tối đa (Max Drawdown) và chỉ số Sharpe trích xuất lợi nhuận giao dịch qua một hàm có cơ chế dự phòng tính toán lại từ giá gốc khi trường `profit` đã lưu không đọc được; trong khi tỷ lệ thắng (win rate) và hệ số lợi nhuận (profit factor) đọc trực tiếp giá trị đã lưu trong bảng. Hiện tại mọi dòng dữ liệu do bộ chạy ghi lại đều có sẵn giá trị `profit` đầy đủ nên các công thức hoàn toàn khớp số liệu với nhau, nhưng đây là chi tiết cần lưu ý nếu sau này có module nào ghi bản ghi trade mà bỏ trống trường `profit`.
