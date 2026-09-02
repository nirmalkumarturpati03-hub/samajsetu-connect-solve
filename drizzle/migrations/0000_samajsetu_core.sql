-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  name text NOT NULL,
  org_type text NOT NULL,
  district text NOT NULL,
  address text,
  lat double precision,
  lng double precision,
  contact_person text,
  contact_email text,
  contact_phone text,
  expertise text[] NOT NULL DEFAULT '{}',
  resources text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT ON public.organizations TO anon;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orgs public read" ON public.organizations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "orgs owner insert" ON public.organizations FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "orgs owner update" ON public.organizations FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "orgs owner delete" ON public.organizations FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- PROBLEMS
CREATE TABLE public.problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  severity text NOT NULL DEFAULT 'medium',
  location_text text,
  district text,
  lat double precision,
  lng double precision,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  reporter_name text,
  reporter_contact text,
  affected_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'reported',
  assigned_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.problems TO authenticated;
GRANT SELECT, INSERT ON public.problems TO anon;
GRANT ALL ON public.problems TO service_role;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "problems public read" ON public.problems FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "problems anyone insert" ON public.problems FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "problems org update" ON public.problems FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- SUPPORTS ("I am also affected")
CREATE TABLE public.problem_supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  comment text,
  media jsonb NOT NULL DEFAULT '[]'::jsonb,
  supporter_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.problem_supports TO anon, authenticated;
GRANT ALL ON public.problem_supports TO service_role;
ALTER TABLE public.problem_supports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "supports public read" ON public.problem_supports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "supports anyone insert" ON public.problem_supports FOR INSERT TO anon, authenticated WITH CHECK (true);

-- VOLUNTEERS / STUDENTS
CREATE TABLE public.volunteers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  photo_url text,
  department text,
  skills text[] NOT NULL DEFAULT '{}',
  experience text,
  availability text NOT NULL DEFAULT 'Available',
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT SELECT ON public.volunteers TO anon;
GRANT ALL ON public.volunteers TO service_role;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "volunteers read" ON public.volunteers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "volunteers org write" ON public.volunteers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "volunteers org update" ON public.volunteers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "volunteers org delete" ON public.volunteers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

-- TASKS
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  volunteer_id uuid REFERENCES public.volunteers(id) ON DELETE SET NULL,
  description text NOT NULL,
  deadline date,
  status text NOT NULL DEFAULT 'pending',
  evidence_media jsonb NOT NULL DEFAULT '[]'::jsonb,
  completion_note text,
  review_status text NOT NULL DEFAULT 'awaiting',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, UPDATE ON public.tasks TO anon;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks read" ON public.tasks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tasks update" ON public.tasks FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "tasks org insert" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));
CREATE POLICY "tasks org delete" ON public.tasks FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id AND o.owner_id = auth.uid()));

-- ESCALATIONS
CREATE TABLE public.escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  from_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  to_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.escalations TO authenticated;
GRANT SELECT ON public.escalations TO anon;
GRANT ALL ON public.escalations TO service_role;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escalations read" ON public.escalations FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "escalations insert" ON public.escalations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "escalations update" ON public.escalations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- TIMELINE
CREATE TABLE public.problem_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id uuid NOT NULL REFERENCES public.problems(id) ON DELETE CASCADE,
  event text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.problem_events TO anon, authenticated;
GRANT ALL ON public.problem_events TO service_role;
ALTER TABLE public.problem_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events read" ON public.problem_events FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "events insert" ON public.problem_events FOR INSERT TO anon, authenticated WITH CHECK (true);

-- PUBLIC ID GENERATOR
CREATE OR REPLACE FUNCTION public.gen_problem_public_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.public_id IS NULL OR NEW.public_id = '' THEN
    NEW.public_id := 'JH-' || to_char(now(), 'YY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''), 1, 6));
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER problems_public_id BEFORE INSERT ON public.problems
FOR EACH ROW EXECUTE FUNCTION public.gen_problem_public_id();

ALTER TABLE public.problems ALTER COLUMN public_id DROP NOT NULL;
