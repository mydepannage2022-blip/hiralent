-- CreateTable
CREATE TABLE "AlgorithmPattern" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "tags" TEXT[],
    "constraints" JSONB NOT NULL,
    "inputStructure" JSONB NOT NULL,
    "extractedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlgorithmPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScrapingJobLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "error" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrapingJobLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlgorithmPattern_source_sourceId_key" ON "AlgorithmPattern"("source", "sourceId");
