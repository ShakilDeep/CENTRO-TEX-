/*
  Warnings:

  - Added the required column `office` to the `samples` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qr_code_url` to the `samples` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_samples" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sample_id" TEXT NOT NULL,
    "sample_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "buyer_name" TEXT,
    "office" TEXT NOT NULL,
    "qr_code_url" TEXT NOT NULL,
    "location_id" TEXT NOT NULL,
    "checked_out_by" TEXT,
    "checked_out_at" DATETIME,
    "due_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "samples_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "samples_checked_out_by_fkey" FOREIGN KEY ("checked_out_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_samples" ("checked_out_at", "checked_out_by", "created_at", "description", "due_date", "id", "location_id", "reference", "sample_id", "sample_type", "updated_at") SELECT "checked_out_at", "checked_out_by", "created_at", "description", "due_date", "id", "location_id", "reference", "sample_id", "sample_type", "updated_at" FROM "samples";
DROP TABLE "samples";
ALTER TABLE "new_samples" RENAME TO "samples";
CREATE UNIQUE INDEX "samples_sample_id_key" ON "samples"("sample_id");
CREATE UNIQUE INDEX "samples_qr_code_url_key" ON "samples"("qr_code_url");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
