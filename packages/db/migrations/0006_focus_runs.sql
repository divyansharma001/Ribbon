CREATE TABLE "focus_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "focus_runs_seconds" CHECK ("focus_runs"."seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "streak_settings" ADD COLUMN "strict_focus" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "focus_runs" ADD CONSTRAINT "focus_runs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "focus_runs_user_started_idx" ON "focus_runs" USING btree ("user_id","started_at");