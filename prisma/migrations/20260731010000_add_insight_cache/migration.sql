-- CreateTable
CREATE TABLE "InsightCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsightCache_userId_month_key" ON "InsightCache"("userId", "month");

-- CreateIndex
CREATE INDEX "InsightCache_userId_month_idx" ON "InsightCache"("userId", "month");
