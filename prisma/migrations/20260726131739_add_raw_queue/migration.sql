-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "rawQueueId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "RawQueue" (
    "id" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,

    CONSTRAINT "RawQueue_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_rawQueueId_fkey" FOREIGN KEY ("rawQueueId") REFERENCES "RawQueue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
