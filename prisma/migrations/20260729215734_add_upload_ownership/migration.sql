-- CreateTable
CREATE TABLE "Upload" (
    "filename" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("filename")
);

-- CreateIndex
CREATE INDEX "Upload_userId_idx" ON "Upload"("userId");

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill ownership for files already attached to an item or receipt, so
-- images uploaded before this table existed remain retrievable.
INSERT INTO "Upload" ("filename", "userId")
SELECT DISTINCT substring("imageUrl" FROM '^/api/files/(.+)$'), "userId"
FROM "Item"
WHERE "imageUrl" LIKE '/api/files/%'
ON CONFLICT ("filename") DO NOTHING;

INSERT INTO "Upload" ("filename", "userId")
SELECT DISTINCT substring("imageUrl" FROM '^/api/files/(.+)$'), "userId"
FROM "Receipt"
WHERE "imageUrl" LIKE '/api/files/%'
ON CONFLICT ("filename") DO NOTHING;
