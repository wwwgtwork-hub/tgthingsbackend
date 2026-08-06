CREATE TABLE "account" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"region" text NOT NULL,
	"seller_user_name" text NOT NULL,
	"account_details" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "add" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"subscribers" integer NOT NULL,
	"seller_user_name" text NOT NULL,
	"days" integer NOT NULL,
	"channel_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favourite_item" (
	"id" serial PRIMARY KEY NOT NULL,
	"userid" text NOT NULL,
	"projectId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"item_type" text DEFAULT 'account' NOT NULL,
	"status" text DEFAULT 'checking' NOT NULL,
	"item_description" text NOT NULL,
	"price" integer NOT NULL,
	"escrow_price" integer,
	"rating" double precision DEFAULT 5 NOT NULL,
	"seller_id" text NOT NULL,
	"buyer_id" text,
	"payout_at" timestamp with time zone,
	"seller_user_name" text NOT NULL,
	"frozen_until" timestamp with time zone,
	"region" text,
	"stars_count" integer,
	"duration_months" integer,
	"subscribers" integer,
	"channel_url" text,
	"add_duration" integer,
	"account_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" serial PRIMARY KEY NOT NULL,
	"to" text NOT NULL,
	"from" text NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nft_and_gift" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"type" text NOT NULL,
	"blockchain_address" text,
	"secret_link_or_code" text NOT NULL,
	"extra_info" text
);
--> statement-breakpoint
CREATE TABLE "payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"seller_id" text,
	"item_id" integer,
	"buyer_confirmed" boolean DEFAULT false,
	"seller_confirmed" boolean DEFAULT false,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"buyer_decline_confirmed" boolean DEFAULT false,
	"seller_decline_confirmed" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_method" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"cardNumber" text NOT NULL,
	"cardcvv" text NOT NULL,
	"mmyy" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"wallet" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "premium" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"duration_months" integer
);
--> statement-breakpoint
CREATE TABLE "rate" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"description" text NOT NULL,
	"rating" double precision NOT NULL,
	"rater_id" text NOT NULL,
	"rated_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"reporter_id" text NOT NULL,
	"reported_id" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stars" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stars_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegramChanel" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" integer NOT NULL,
	"subscribers" integer NOT NULL,
	"seller_user_name" text NOT NULL,
	"channel_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" text NOT NULL,
	"user_name" text NOT NULL,
	"name" text NOT NULL,
	"rating" double precision DEFAULT 5 NOT NULL,
	"money_count" integer DEFAULT 0 NOT NULL,
	"user_items_total" integer DEFAULT 0 NOT NULL,
	"user_items_selled" integer DEFAULT 0 NOT NULL,
	"user_items_bought" integer DEFAULT 0 NOT NULL,
	"selled_total" integer DEFAULT 0 NOT NULL,
	"purchased_total" integer DEFAULT 0 NOT NULL,
	"user_rating_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"banned_until" timestamp with time zone,
	"ban_reason" text,
	"role" text DEFAULT 'user' NOT NULL,
	"warns_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id"),
	CONSTRAINT "users_user_name_unique" UNIQUE("user_name")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "add" ADD CONSTRAINT "add_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_seller_id_users_telegram_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item" ADD CONSTRAINT "item_buyer_id_users_telegram_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nft_and_gift" ADD CONSTRAINT "nft_and_gift_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_user_id_users_telegram_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_seller_id_users_telegram_id_fk" FOREIGN KEY ("seller_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment" ADD CONSTRAINT "payment_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout" ADD CONSTRAINT "payout_user_id_users_telegram_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium" ADD CONSTRAINT "premium_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate" ADD CONSTRAINT "rate_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate" ADD CONSTRAINT "rate_rater_id_users_telegram_id_fk" FOREIGN KEY ("rater_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rate" ADD CONSTRAINT "rate_rated_id_users_telegram_id_fk" FOREIGN KEY ("rated_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_id_users_telegram_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report" ADD CONSTRAINT "report_reported_id_users_telegram_id_fk" FOREIGN KEY ("reported_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stars" ADD CONSTRAINT "stars_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegramChanel" ADD CONSTRAINT "telegramChanel_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE cascade ON UPDATE no action;