-- Reverts the additional funding-source columns introduced by the now-withdrawn
-- financial-transparency record-details change. The original source and
-- utilization fields remain unchanged.
alter table public.funding_sources
  drop column if exists funding_source,
  drop column if exists funding_category_detail,
  drop column if exists district_area;
