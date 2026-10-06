ALTER TABLE "annotations" ADD COLUMN "group_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "annotations_group_idx" ON "annotations" USING btree ("user_id","group_id");