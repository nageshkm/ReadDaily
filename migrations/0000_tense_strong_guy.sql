CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text NOT NULL,
	"source_url" text NOT NULL,
	"image_url" text NOT NULL,
	"estimated_reading_time" integer NOT NULL,
	"category_id" text NOT NULL,
	"publish_date" text NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"youtube_video_id" text,
	"channel_name" text,
	"transcript" text,
	"is_summarized" boolean DEFAULT false,
	"processing_status" text DEFAULT 'pending'
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"join_date" text NOT NULL,
	"last_active" text NOT NULL,
	"preferences" text NOT NULL,
	"read_articles" text NOT NULL,
	"streak_data" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;