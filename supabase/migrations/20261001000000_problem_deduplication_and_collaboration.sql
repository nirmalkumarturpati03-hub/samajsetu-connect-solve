-- Migration: Problem Deduplication Merging and Organization Collaboration Chat
-- Samaj Setu — SIH26043

-- 1. Ensure duplicate_status and merged_into_id columns exist on challenges
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenges' AND column_name = 'merged_into_id'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN merged_into_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'challenges' AND column_name = 'duplicate_status'
  ) THEN
    ALTER TABLE public.challenges ADD COLUMN duplicate_status TEXT DEFAULT NULL;
  END IF;
END $$;

-- 2. Create canonical challenge merging RPC function
CREATE OR REPLACE FUNCTION public.merge_challenges(
  canonical_id UUID,
  duplicate_id UUID,
  merge_reason TEXT DEFAULT 'Merged duplicate civic report'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_role TEXT;
  v_canonical RECORD;
  v_duplicate RECORD;
  v_reports_moved INT := 0;
  v_supports_moved INT := 0;
  v_media_moved INT := 0;
BEGIN
  -- Authenticate admin / official authorization
  SELECT role::text INTO v_caller_role FROM public.profiles WHERE id = auth.uid();
  IF v_caller_role IS NULL OR lower(trim(v_caller_role)) NOT IN ('admin', 'government', 'pri') THEN
    RAISE EXCEPTION 'Unauthorized: Only administrator or municipal verifier can merge challenges.';
  END IF;

  IF canonical_id = duplicate_id THEN
    RAISE EXCEPTION 'Cannot merge challenge into itself.';
  END IF;

  SELECT * INTO v_canonical FROM public.challenges WHERE id = canonical_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canonical challenge not found.';
  END IF;

  SELECT * INTO v_duplicate FROM public.challenges WHERE id = duplicate_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Duplicate challenge not found.';
  END IF;

  -- 1. Re-link all reports to canonical challenge without deleting any report records
  UPDATE public.reports
  SET challenge_id = canonical_id
  WHERE challenge_id = duplicate_id;
  GET DIAGNOSTICS v_reports_moved = ROW_COUNT;

  -- 2. Transfer supports: insert any supports that do not already exist on canonical
  INSERT INTO public.challenge_supports (challenge_id, supporter_id, note, created_at)
  SELECT canonical_id, supporter_id, note, created_at
  FROM public.challenge_supports
  WHERE challenge_id = duplicate_id
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS v_supports_moved = ROW_COUNT;

  -- 3. Transfer challenge media attachments to canonical challenge
  UPDATE public.challenge_media
  SET challenge_id = canonical_id
  WHERE challenge_id = duplicate_id;
  GET DIAGNOSTICS v_media_moved = ROW_COUNT;

  -- 4. Mark duplicate challenge as merged into canonical
  UPDATE public.challenges
  SET
    merged_into_id = canonical_id,
    duplicate_status = 'MERGED',
    rejection_reason = coalesce(merge_reason, 'Merged into canonical challenge ' || v_canonical.public_id),
    updated_at = now()
  WHERE id = duplicate_id;

  -- 5. Insert audit log record
  INSERT INTO public.audit_logs (
    entity_type,
    entity_id,
    action,
    performed_by,
    details
  ) VALUES (
    'challenge',
    duplicate_id,
    'CHALLENGE_MERGED',
    auth.uid(),
    jsonb_build_object(
      'canonical_id', canonical_id,
      'canonical_public_id', v_canonical.public_id,
      'duplicate_public_id', v_duplicate.public_id,
      'reports_preserved', v_reports_moved,
      'supports_transferred', v_supports_moved,
      'media_transferred', v_media_moved,
      'reason', merge_reason,
      'merged_at', now()
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'canonical_id', canonical_id,
    'duplicate_id', duplicate_id,
    'reports_preserved', v_reports_moved,
    'supports_transferred', v_supports_moved,
    'media_transferred', v_media_moved
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_challenges(UUID, UUID, TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.merge_challenges(UUID, UUID, TEXT) TO authenticated;

-- 3. Create Organization Collaborations Table
CREATE TABLE IF NOT EXISTS public.organization_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE RESTRICT,
  requesting_org_id UUID REFERENCES public.organization_accounts(id) ON DELETE RESTRICT,
  target_org_id UUID REFERENCES public.organization_accounts(id) ON DELETE RESTRICT,
  request_message TEXT NOT NULL,
  status TEXT CHECK (status IN ('Pending', 'Accepted', 'Rejected', 'Cancelled')) DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_org_collab_project ON public.organization_collaborations(project_id);
CREATE INDEX IF NOT EXISTS idx_org_collab_target ON public.organization_collaborations(target_org_id);
CREATE INDEX IF NOT EXISTS idx_org_collab_requesting ON public.organization_collaborations(requesting_org_id);

-- 4. Create Collaboration Messages Table (Strict Persistence: Never deleted on project completion)
CREATE TABLE IF NOT EXISTS public.collaboration_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID,
  collaboration_id UUID REFERENCES public.organization_collaborations(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT,
  sender_user_id UUID REFERENCES public.profiles(id),
  sender_org_id UUID REFERENCES public.organization_accounts(id),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collab_msgs_collab_id ON public.collaboration_messages(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_collab_msgs_project_id ON public.collaboration_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_collab_msgs_created_at ON public.collaboration_messages(created_at);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.organization_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_messages ENABLE ROW LEVEL SECURITY;

-- Collaborations: select allowed for members of requesting or target organizations, or admins
DROP POLICY IF EXISTS "collab_select_policy" ON public.organization_collaborations;
CREATE POLICY "collab_select_policy" ON public.organization_collaborations
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_accounts oa
    WHERE oa.owner_id = auth.uid() AND (oa.id = requesting_org_id OR oa.id = target_org_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(trim(p.role::text)) IN ('admin', 'university_admin', 'industry_partner')
  )
);

-- Collaborations: insert allowed for authorized requesting organization owner
DROP POLICY IF EXISTS "collab_insert_policy" ON public.organization_collaborations;
CREATE POLICY "collab_insert_policy" ON public.organization_collaborations
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_accounts oa
    WHERE oa.owner_id = auth.uid() AND oa.id = requesting_org_id
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(trim(p.role::text)) IN ('admin', 'university_admin', 'industry_partner')
  )
);

-- Collaborations: update allowed for target organization or admin
DROP POLICY IF EXISTS "collab_update_policy" ON public.organization_collaborations;
CREATE POLICY "collab_update_policy" ON public.organization_collaborations
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_accounts oa
    WHERE oa.owner_id = auth.uid() AND (oa.id = target_org_id OR oa.id = requesting_org_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(trim(p.role::text)) = 'admin'
  )
);

-- Collaboration Messages: select allowed for participating organizations or admins
DROP POLICY IF EXISTS "collab_msgs_select_policy" ON public.collaboration_messages;
CREATE POLICY "collab_msgs_select_policy" ON public.collaboration_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organization_collaborations oc
    JOIN public.organization_accounts oa ON (oa.id = oc.requesting_org_id OR oa.id = oc.target_org_id)
    WHERE oc.id = collaboration_id AND oa.owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(trim(p.role::text)) IN ('admin', 'university_admin', 'industry_partner')
  )
);

-- Collaboration Messages: insert allowed for authorized member of collaboration
DROP POLICY IF EXISTS "collab_msgs_insert_policy" ON public.collaboration_messages;
CREATE POLICY "collab_msgs_insert_policy" ON public.collaboration_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND lower(trim(p.role::text)) IN ('admin', 'university_admin', 'industry_partner')
  )
);

-- Collaboration Messages: NO DELETE POLICY ALLOWED. Chat history must never be deleted!

-- 6. Add real-time publication support for collaboration & chat
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'organization_collaborations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_collaborations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'collaboration_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_messages;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
