CREATE TABLE "streak_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"goal_minutes" integer DEFAULT 10 NOT NULL,
	"weekends_off" boolean DEFAULT false NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"reminder_at" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "streak_settings_goal" CHECK ("streak_settings"."goal_minutes" between 1 and 240)
);
--> statement-breakpoint
ALTER TABLE "streak_settings" ADD CONSTRAINT "streak_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;