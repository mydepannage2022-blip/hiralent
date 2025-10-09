-- CreateTable
CREATE TABLE "public"."UploadedDocument" (
    "document_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "url" TEXT,
    "mime_type" TEXT NOT NULL,
    "file_ext" TEXT,
    "file_size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "preview_key" TEXT,
    "preview_ready" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("document_id")
);

-- CreateIndex
CREATE INDEX "UploadedDocument_subject_type_subject_id_idx" ON "public"."UploadedDocument"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "UploadedDocument_uploaded_by_idx" ON "public"."UploadedDocument"("uploaded_by");

-- CreateIndex
CREATE INDEX "UploadedDocument_document_type_idx" ON "public"."UploadedDocument"("document_type");

-- AddForeignKey
ALTER TABLE "public"."UploadedDocument" ADD CONSTRAINT "UploadedDocument_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
