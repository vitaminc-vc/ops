CREATE SCHEMA IF NOT EXISTS "vitamin_data";
--> statement-breakpoint
REVOKE ALL ON SCHEMA "vitamin_data" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
CREATE TABLE "vitamin_data"."agent_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"request" text NOT NULL,
	"result" text,
	"sources" jsonb,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "vitamin_data"."agent_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vitamin_data"."companies" (
	"id" text PRIMARY KEY NOT NULL,
	"identity_key" text NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"founder" text,
	"description" text,
	"source" text NOT NULL,
	"source_id" text,
	"notion_page_id" text,
	"notion_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_identity_key_unique" UNIQUE("identity_key")
);
--> statement-breakpoint
ALTER TABLE "vitamin_data"."companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vitamin_data"."documents" (
	"id" text PRIMARY KEY NOT NULL,
	"ingestion_id" text NOT NULL,
	"company_id" text,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"content" text NOT NULL,
	"data" "bytea" NOT NULL,
	"sha256" text NOT NULL,
	"notion_file_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vitamin_data"."documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vitamin_data"."ingestions" (
	"id" text PRIMARY KEY NOT NULL,
	"mailbox" text NOT NULL,
	"message_id" text NOT NULL,
	"status" text NOT NULL,
	"decision" text NOT NULL,
	"reason" text NOT NULL,
	"content" jsonb,
	"company_id" text,
	"memory_id" text,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vitamin_data"."ingestions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vitamin_data"."mailboxes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_sync" timestamp with time zone,
	"last_error" text,
	CONSTRAINT "mailboxes_account_id_unique" UNIQUE("account_id"),
	CONSTRAINT "mailboxes_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "vitamin_data"."mailboxes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vitamin_data"."documents" ADD CONSTRAINT "documents_ingestion_id_ingestions_id_fk" FOREIGN KEY ("ingestion_id") REFERENCES "vitamin_data"."ingestions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitamin_data"."documents" ADD CONSTRAINT "documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "vitamin_data"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitamin_data"."ingestions" ADD CONSTRAINT "ingestions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "vitamin_data"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_runs_created_idx" ON "vitamin_data"."agent_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "document_ingestion_idx" ON "vitamin_data"."documents" USING btree ("ingestion_id");--> statement-breakpoint
CREATE INDEX "ingestion_mailbox_idx" ON "vitamin_data"."ingestions" USING btree ("mailbox");--> statement-breakpoint
CREATE INDEX "ingestion_status_idx" ON "vitamin_data"."ingestions" USING btree ("status");--> statement-breakpoint
CREATE POLICY "vitamin_c_server_access" ON "vitamin_data"."agent_runs" AS PERMISSIVE FOR ALL TO "vitamin_c_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "vitamin_c_server_access" ON "vitamin_data"."companies" AS PERMISSIVE FOR ALL TO "vitamin_c_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "vitamin_c_server_access" ON "vitamin_data"."documents" AS PERMISSIVE FOR ALL TO "vitamin_c_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "vitamin_c_server_access" ON "vitamin_data"."ingestions" AS PERMISSIVE FOR ALL TO "vitamin_c_app" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "vitamin_c_server_access" ON "vitamin_data"."mailboxes" AS PERMISSIVE FOR ALL TO "vitamin_c_app" USING (true) WITH CHECK (true);
--> statement-breakpoint
ALTER TABLE vitamin_data.ingestions ADD CONSTRAINT screened_content_only CHECK (decision = 'include' OR content IS NULL);
ALTER TABLE vitamin_data.ingestions ADD CONSTRAINT ingestion_decision CHECK (decision IN ('include', 'exclude', 'review'));
REVOKE ALL ON ALL TABLES IN SCHEMA vitamin_data FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA vitamin_data TO vitamin_c_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA vitamin_data TO vitamin_c_app;
