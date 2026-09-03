-- CreateTable
CREATE TABLE "DatasetLease" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DatasetLease_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatasetLease_datasetId_expiresAt_idx" ON "DatasetLease"("datasetId", "expiresAt");

-- AddForeignKey
ALTER TABLE "DatasetLease" ADD CONSTRAINT "DatasetLease_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
