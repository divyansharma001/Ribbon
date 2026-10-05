CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anchors" (
	"book_id" text NOT NULL,
	"anchor" text NOT NULL,
	"chapter_id" text NOT NULL,
	"block_id" text NOT NULL,
	CONSTRAINT "anchors_book_id_anchor_pk" PRIMARY KEY("book_id","anchor")
);
--> statement-breakpoint
CREATE TABLE "blocks" (
	"book_id" text NOT NULL,
	"id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"position" integer NOT NULL,
	"section_anchor" text NOT NULL,
	"type" text NOT NULL,
	"hash" text NOT NULL,
	"words" integer NOT NULL,
	"data" jsonb NOT NULL,
	"text" text NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED NOT NULL,
	CONSTRAINT "blocks_book_id_id_pk" PRIMARY KEY("book_id","id")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"authors" text[] NOT NULL,
	"edition" integer NOT NULL,
	"publisher" text NOT NULL,
	"published" text NOT NULL,
	"isbn" text NOT NULL,
	"content_hash" text NOT NULL,
	"loaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"book_id" text NOT NULL,
	"id" text NOT NULL,
	"position" integer NOT NULL,
	"number" integer,
	"title" text NOT NULL,
	"anchor" text NOT NULL,
	"words" integer NOT NULL,
	"block_count" integer NOT NULL,
	"outline" jsonb NOT NULL,
	"notes" jsonb NOT NULL,
	CONSTRAINT "chapters_book_id_id_pk" PRIMARY KEY("book_id","id")
);
--> statement-breakpoint
CREATE TABLE "glossary_entries" (
	"book_id" text NOT NULL,
	"term" text NOT NULL,
	"position" integer NOT NULL,
	"body" jsonb NOT NULL,
	CONSTRAINT "glossary_entries_book_id_term_pk" PRIMARY KEY("book_id","term")
);
--> statement-breakpoint
CREATE TABLE "index_terms" (
	"book_id" text NOT NULL,
	"block_id" text NOT NULL,
	"primary" text NOT NULL,
	"secondary" text DEFAULT '' NOT NULL,
	CONSTRAINT "index_terms_book_id_block_id_primary_secondary_pk" PRIMARY KEY("book_id","block_id","primary","secondary")
);
--> statement-breakpoint
CREATE TABLE "annotations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"kind" text NOT NULL,
	"chapter_id" text NOT NULL,
	"block_id" text NOT NULL,
	"block_hash" text NOT NULL,
	"range" jsonb,
	"color" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "annotations_kind" CHECK ("annotations"."kind" in ('bookmark', 'highlight', 'note'))
);
--> statement-breakpoint
CREATE TABLE "block_reads" (
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"block_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"first_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "block_reads_user_id_book_id_block_id_pk" PRIMARY KEY("user_id","book_id","block_id")
);
--> statement-breakpoint
CREATE TABLE "reading_positions" (
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"device_id" text NOT NULL,
	"device_label" text NOT NULL,
	"chapter_id" text NOT NULL,
	"block_id" text NOT NULL,
	"block_hash" text NOT NULL,
	"offset" real DEFAULT 0 NOT NULL,
	"read_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_positions_user_id_book_id_device_id_pk" PRIMARY KEY("user_id","book_id","device_id"),
	CONSTRAINT "reading_positions_offset_range" CHECK ("reading_positions"."offset" >= 0 and "reading_positions"."offset" <= 1)
);
--> statement-breakpoint
CREATE TABLE "reading_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"device_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"start_block_id" text NOT NULL,
	"end_block_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone NOT NULL,
	"active_seconds" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "reading_sessions_active_seconds" CHECK ("reading_sessions"."active_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"reader" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anchors" ADD CONSTRAINT "anchors_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "glossary_entries" ADD CONSTRAINT "glossary_entries_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "index_terms" ADD CONSTRAINT "index_terms_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_reads" ADD CONSTRAINT "block_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "block_reads" ADD CONSTRAINT "block_reads_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD CONSTRAINT "reading_positions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_positions" ADD CONSTRAINT "reading_positions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_sessions" ADD CONSTRAINT "reading_sessions_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "blocks_chapter_position_idx" ON "blocks" USING btree ("book_id","chapter_id","position");--> statement-breakpoint
CREATE INDEX "blocks_hash_idx" ON "blocks" USING btree ("book_id","hash");--> statement-breakpoint
CREATE INDEX "blocks_search_idx" ON "blocks" USING gin ("search");--> statement-breakpoint
CREATE INDEX "index_terms_primary_idx" ON "index_terms" USING btree ("book_id","primary");--> statement-breakpoint
CREATE INDEX "annotations_user_book_idx" ON "annotations" USING btree ("user_id","book_id","chapter_id");--> statement-breakpoint
CREATE INDEX "block_reads_chapter_idx" ON "block_reads" USING btree ("user_id","book_id","chapter_id");--> statement-breakpoint
CREATE INDEX "reading_positions_latest_idx" ON "reading_positions" USING btree ("user_id","book_id","read_at");--> statement-breakpoint
CREATE INDEX "reading_sessions_user_started_idx" ON "reading_sessions" USING btree ("user_id","started_at");