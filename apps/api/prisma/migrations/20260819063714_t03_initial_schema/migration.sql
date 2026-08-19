-- CreateTable
CREATE TABLE "Candle" (
    "pair" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "openTime" TIMESTAMPTZ(3) NOT NULL,
    "open" DECIMAL(38,18) NOT NULL,
    "high" DECIMAL(38,18) NOT NULL,
    "low" DECIMAL(38,18) NOT NULL,
    "close" DECIMAL(38,18) NOT NULL,
    "volume" DECIMAL(38,18) NOT NULL,

    CONSTRAINT "Candle_pkey" PRIMARY KEY ("pair","timeframe","openTime")
);

-- CreateTable
CREATE TABLE "Strategy" (
    "strategyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "warmup" INTEGER NOT NULL,
    "params" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("strategyId","version")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "from" TIMESTAMPTZ(3) NOT NULL,
    "to" TIMESTAMPTZ(3) NOT NULL,
    "entryPrice" TEXT NOT NULL,
    "feeRate" DECIMAL(18,8) NOT NULL,
    "warmupCandles" INTEGER NOT NULL,
    "profitMode" TEXT NOT NULL,
    "drawdownMode" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experiment" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "spec" JSONB NOT NULL,
    "specHash" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "totalReturn" DOUBLE PRECISION,
    "profitLoss" DECIMAL(38,18),
    "winRate" DOUBLE PRECISION,
    "tradeCount" INTEGER,
    "maxDrawdown" DOUBLE PRECISION,
    "profitFactor" DOUBLE PRECISION,
    "sharpeRatio" DOUBLE PRECISION,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Experiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "side" TEXT NOT NULL,
    "entryTime" TIMESTAMPTZ(3) NOT NULL,
    "entryPrice" DECIMAL(38,18) NOT NULL,
    "exitTime" TIMESTAMPTZ(3) NOT NULL,
    "exitPrice" DECIMAL(38,18) NOT NULL,
    "profit" DECIMAL(38,18) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMPTZ(3) NOT NULL,
    "crawledAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "relatedCoins" TEXT[],
    "sentimentLabel" TEXT,
    "sentimentScore" DOUBLE PRECISION,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_pair_timeframe_from_to_entryPrice_feeRate_warmupCan_key" ON "Dataset"("pair", "timeframe", "from", "to", "entryPrice", "feeRate", "warmupCandles", "profitMode", "drawdownMode");

-- CreateIndex
CREATE INDEX "Experiment_datasetId_status_idx" ON "Experiment"("datasetId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Experiment_datasetId_specHash_key" ON "Experiment"("datasetId", "specHash");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_experimentId_seq_key" ON "Trade"("experimentId", "seq");

-- CreateIndex
CREATE UNIQUE INDEX "News_url_key" ON "News"("url");

-- CreateIndex
CREATE INDEX "News_publishedAt_idx" ON "News"("publishedAt");

-- CreateIndex
CREATE INDEX "News_relatedCoins_idx" ON "News" USING GIN ("relatedCoins");

-- AddForeignKey
ALTER TABLE "Experiment" ADD CONSTRAINT "Experiment_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "Experiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
