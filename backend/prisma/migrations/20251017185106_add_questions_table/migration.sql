-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "problemStatement" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "skillTags" TEXT[],
    "type" TEXT NOT NULL,
    "canonicalSolution" TEXT NOT NULL,
    "testCases" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdBy" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);
