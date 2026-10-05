CREATE TABLE "quiz_answers" (
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"question_id" text NOT NULL,
	"chapter_id" text NOT NULL,
	"first_correct" boolean NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"first_answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_answers_user_id_book_id_question_id_pk" PRIMARY KEY("user_id","book_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "review_cards" (
	"user_id" text NOT NULL,
	"book_id" text NOT NULL,
	"question_id" text NOT NULL,
	"box" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone NOT NULL,
	"reviews" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	CONSTRAINT "review_cards_user_id_book_id_question_id_pk" PRIMARY KEY("user_id","book_id","question_id"),
	CONSTRAINT "review_cards_box" CHECK ("review_cards"."box" between 0 and 5)
);
--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_cards" ADD CONSTRAINT "review_cards_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_cards" ADD CONSTRAINT "review_cards_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "quiz_answers_chapter_idx" ON "quiz_answers" USING btree ("user_id","book_id","chapter_id");--> statement-breakpoint
CREATE INDEX "review_cards_due_idx" ON "review_cards" USING btree ("user_id","due_at");