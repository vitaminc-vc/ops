-- Target: Vitamin°C Supabase project euaxzitprzcazefjfjuu.
-- Review before running. Creates persistent server access to vitamin_auth only.
-- Run in the dashboard SQL Editor as postgres. The final result is a secret:
-- put it in SUPABASE_DB_PASSWORD in the ignored .env.local, and set
-- DATABASE_USER=vitamin_c_app.euaxzitprzcazefjfjuu.
-- No existing credential is changed. No schema, owner, or admin rights are granted.

CREATE OR REPLACE FUNCTION pg_temp.provision_vitamin_c_app()
RETURNS text
LANGUAGE plpgsql
AS $provision$
DECLARE
  app_password text;
BEGIN
  IF current_user <> 'postgres' OR current_database() <> 'postgres' THEN
    RAISE EXCEPTION 'Run this setup as postgres in the selected Vitamin°C project.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vitamin_c_app') THEN
    RAISE EXCEPTION 'vitamin_c_app already exists; setup stopped without changing its password.';
  END IF;

  app_password := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  EXECUTE format(
    'CREATE ROLE vitamin_c_app WITH LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 10',
    app_password
  );

  GRANT CONNECT ON DATABASE postgres TO vitamin_c_app;
  GRANT USAGE ON SCHEMA vitamin_auth TO vitamin_c_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    vitamin_auth."user", vitamin_auth.account, vitamin_auth.session, vitamin_auth.verification
    TO vitamin_c_app;

  CREATE POLICY vitamin_c_server_access ON vitamin_auth."user"
    FOR ALL TO vitamin_c_app USING (true) WITH CHECK (true);
  CREATE POLICY vitamin_c_server_access ON vitamin_auth.account
    FOR ALL TO vitamin_c_app USING (true) WITH CHECK (true);
  CREATE POLICY vitamin_c_server_access ON vitamin_auth.session
    FOR ALL TO vitamin_c_app USING (true) WITH CHECK (true);
  CREATE POLICY vitamin_c_server_access ON vitamin_auth.verification
    FOR ALL TO vitamin_c_app USING (true) WITH CHECK (true);

  ALTER ROLE vitamin_c_app SET search_path = vitamin_auth, pg_catalog;
  RETURN app_password;
END;
$provision$;

SELECT pg_temp.provision_vitamin_c_app() AS vitamin_c_app_password;
