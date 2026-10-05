CREATE SCHEMA "vitamin_auth";
--> statement-breakpoint
CREATE TABLE "vitamin_auth"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vitamin_auth"."account" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vitamin_auth"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "vitamin_auth"."session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vitamin_auth"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'scout' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_check" CHECK ("vitamin_auth"."user"."role" in ('admin', 'scout'))
);
--> statement-breakpoint
ALTER TABLE "vitamin_auth"."user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vitamin_auth"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vitamin_auth"."verification" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vitamin_auth"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "vitamin_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitamin_auth"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "vitamin_auth"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "vitamin_auth"."account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_unique" ON "vitamin_auth"."account" USING btree ("provider_id","account_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "vitamin_auth"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_expiry_idx" ON "vitamin_auth"."session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_lower_unique" ON "vitamin_auth"."user" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "vitamin_auth"."user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "vitamin_auth"."verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "verification_expiry_idx" ON "vitamin_auth"."verification" USING btree ("expires_at");
--> statement-breakpoint
REVOKE ALL ON SCHEMA "vitamin_auth" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "vitamin_auth" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "vitamin_auth" REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
