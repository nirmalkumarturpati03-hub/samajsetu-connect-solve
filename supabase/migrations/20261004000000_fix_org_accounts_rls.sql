-- Allow users to INSERT their own organization_accounts row
-- (previously only ALL was set which was ambiguous without explicit INSERT)
-- This ensures the upsert in loadProfile succeeds on first sign-in.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organization_accounts'
      AND policyname = 'organization owner can insert own account'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "organization owner can insert own account"
        ON organization_accounts
        FOR INSERT
        WITH CHECK (owner_id = auth.uid());
    $policy$;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organization_accounts'
      AND policyname = 'organization owner reads own account'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "organization owner reads own account"
        ON organization_accounts
        FOR SELECT
        USING (owner_id = auth.uid());
    $policy$;
  END IF;
END $$;
