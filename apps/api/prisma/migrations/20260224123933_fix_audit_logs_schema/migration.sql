-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "sample_id" TEXT,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_values" TEXT,
    "new_values" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,
    CONSTRAINT "audit_logs_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_audit_logs" ("action", "id", "ip_address", "new_values", "old_values", "record_id", "sample_id", "table_name", "timestamp", "user_agent", "user_id") SELECT "action", "id", "ip_address", "new_values", "old_values", "record_id", "sample_id", "table_name", "timestamp", "user_agent", "user_id" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "audit_logs"("table_name", "record_id");
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
CREATE INDEX "audit_logs_table_name_timestamp_idx" ON "audit_logs"("table_name", "timestamp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
