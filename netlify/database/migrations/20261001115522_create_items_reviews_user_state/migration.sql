CREATE TABLE "items" (
	"user_id" text,
	"kind" text,
	"id" text,
	"data" jsonb NOT NULL,
	"study" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_pkey" PRIMARY KEY("user_id","kind","id")
);
--> statement-breakpoint
CREATE TABLE "review_logs" (
	"user_id" text,
	"id" text,
	"ts" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "review_logs_pkey" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "user_state" (
	"user_id" text PRIMARY KEY,
	"progress" jsonb,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "review_logs_user_ts_idx" ON "review_logs" ("user_id","ts");