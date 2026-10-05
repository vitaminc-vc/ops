-- The server login is provisioned separately. On a fresh database, the
-- provisioning script installs these same policies after creating the login.
-- Existing approved policies are preserved when recording this migration.
DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vitamin_c_app') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'vitamin_auth' AND tablename = 'account' AND policyname = 'vitamin_c_server_access') THEN
      CREATE POLICY "vitamin_c_server_access" ON "vitamin_auth"."account" AS PERMISSIVE FOR ALL TO "vitamin_c_app" USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'vitamin_auth' AND tablename = 'session' AND policyname = 'vitamin_c_server_access') THEN
      CREATE POLICY "vitamin_c_server_access" ON "vitamin_auth"."session" AS PERMISSIVE FOR ALL TO "vitamin_c_app" USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'vitamin_auth' AND tablename = 'user' AND policyname = 'vitamin_c_server_access') THEN
      CREATE POLICY "vitamin_c_server_access" ON "vitamin_auth"."user" AS PERMISSIVE FOR ALL TO "vitamin_c_app" USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'vitamin_auth' AND tablename = 'verification' AND policyname = 'vitamin_c_server_access') THEN
      CREATE POLICY "vitamin_c_server_access" ON "vitamin_auth"."verification" AS PERMISSIVE FOR ALL TO "vitamin_c_app" USING (true) WITH CHECK (true);
    END IF;
  END IF;
END;
$migration$;
