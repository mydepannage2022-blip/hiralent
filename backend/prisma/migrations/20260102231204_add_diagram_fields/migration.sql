-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "diagramCode" TEXT,
ADD COLUMN     "diagramImageUrl" TEXT,
ADD COLUMN     "diagramMetadata" JSONB,
ADD COLUMN     "diagramType" TEXT,
ADD COLUMN     "hasDiagram" BOOLEAN NOT NULL DEFAULT false;
