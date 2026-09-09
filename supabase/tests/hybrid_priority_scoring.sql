-- Run after migrations in a disposable Supabase database:
--   psql "$SUPABASE_DB_URL" -f supabase/tests/hybrid_priority_scoring.sql
-- All assertions run inside a transaction and leave no data behind.
begin;
do $$
declare cases jsonb := '[
  {"name":"contaminated drinking water","f":{"severity":94,"urgency":97,"population_impact":88,"health_safety_risk":95,"essential_service_impact":92,"vulnerable_population":80,"persistence":65}},
  {"name":"broken village handpump","f":{"severity":65,"urgency":70,"population_impact":55,"health_safety_risk":55,"essential_service_impact":75,"vulnerable_population":40,"persistence":70}},
  {"name":"dangerous electrical wire","f":{"severity":95,"urgency":95,"population_impact":40,"health_safety_risk":98,"essential_service_impact":50,"vulnerable_population":20,"persistence":30}},
  {"name":"damaged rural road","f":{"severity":65,"urgency":55,"population_impact":70,"health_safety_risk":45,"essential_service_impact":55,"vulnerable_population":35,"persistence":75}},
  {"name":"school sanitation","f":{"severity":72,"urgency":72,"population_impact":65,"health_safety_risk":75,"essential_service_impact":80,"vulnerable_population":85,"persistence":70}},
  {"name":"hospital equipment shortage","f":{"severity":88,"urgency":90,"population_impact":72,"health_safety_risk":90,"essential_service_impact":95,"vulnerable_population":70,"persistence":55}},
  {"name":"streetlight not working","f":{"severity":42,"urgency":45,"population_impact":45,"health_safety_risk":40,"essential_service_impact":35,"vulnerable_population":20,"persistence":60}},
  {"name":"waste accumulation","f":{"severity":55,"urgency":55,"population_impact":60,"health_safety_risk":60,"essential_service_impact":45,"vulnerable_population":35,"persistence":75}},
  {"name":"flooded emergency access","f":{"severity":95,"urgency":98,"population_impact":75,"health_safety_risk":90,"essential_service_impact":90,"vulnerable_population":60,"persistence":50}},
  {"name":"minor public-space maintenance","f":{"severity":12,"urgency":10,"population_impact":15,"health_safety_risk":5,"essential_service_impact":10,"vulnerable_population":5,"persistence":30}}
]'::jsonb; item jsonb; score smallint; critical_high jsonb := '{"severity":100,"urgency":75,"population_impact":85,"health_safety_risk":95,"essential_service_impact":95,"vulnerable_population":90,"persistence":70}'::jsonb; critical_critical jsonb := '{"severity":100,"urgency":100,"population_impact":85,"health_safety_risk":95,"essential_service_impact":95,"vulnerable_population":90,"persistence":70}'::jsonb;
begin
  for item in select value from jsonb_array_elements(cases) loop
    score := public.priority_score_for(item->'f');
    if score not between 0 and 100 then raise exception 'Out-of-range score for %', item->>'name'; end if;
  end loop;
  if public.priority_score_for((cases->0)->'f') <= public.priority_score_for((cases->9)->'f') then raise exception 'High-risk water case must outrank minor maintenance'; end if;
  if public.priority_level_for(public.priority_score_for((cases->5)->'f')) not in ('HIGH','CRITICAL') then raise exception 'Hospital shortage should be high priority'; end if;
  if public.manual_severity_factor(1) <> 25 or public.manual_severity_factor(2) <> 50 or public.manual_severity_factor(3) <> 75 or public.manual_severity_factor(4) <> 100 then raise exception 'Severity mapping is not categorical 25/50/75/100'; end if;
  if public.manual_urgency_factor(1) <> 25 or public.manual_urgency_factor(2) <> 50 or public.manual_urgency_factor(3) <> 75 or public.manual_urgency_factor(4) <> 100 then raise exception 'Urgency mapping is not categorical 25/50/75/100'; end if;
  if public.priority_score_for(critical_high) <> 89 then raise exception 'Critical + high drinking-water test should score 89, got %', public.priority_score_for(critical_high); end if;
  if public.priority_score_for(critical_critical) <= public.priority_score_for(critical_high) then raise exception 'Increasing urgency must never reduce score'; end if;
  if public.priority_level_for(public.priority_score_for(critical_high)) <> 'HIGH' then raise exception 'Critical + high contextual test should be HIGH'; end if;
end $$;
rollback;
