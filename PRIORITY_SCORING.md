# Hybrid priority scoring

The system ranks unresolved civic challenges by the persisted `priority_score`, then critical status, urgency, and report age. It is intentionally separate from `allocate_smart_task`, which continues to select a suitable partner based on capability, distance, availability, workload, and performance.

## Formula

PostgreSQL calculates (and rounds) the final score:

`severity×30% + urgency×25% + population×15% + health/safety×10% + essential service×10% + vulnerable population×5% + persistence×5%`

The values and thresholds are controlled by the single `priority_scoring_settings` row. A trusted emergency/critical-hazard signal can raise a score to 90 and level `CRITICAL`; it needs confidence ≥80, evidence, or verification. Low-confidence AI results use deterministic report-field fallback and are marked `HUMAN_REVIEW_REQUIRED`.

Citizen-selected categorical signals are authoritative: severity maps `Minor/Moderate/High/Critical` to `25/50/75/100`, while urgency maps `Low/Medium/High/Critical` to `25/50/75/100`. AI cannot replace or rescale either value; it only enriches the five contextual factors.

## Deploy

1. Apply `20260922000000_hybrid_ai_priority.sql` and `20260923000000_priority_manual_signal_calibration.sql` through the normal Supabase migration process.
2. Deploy `supabase/functions/analyze-priority`.
3. Set `OPENAI_API_KEY` and optionally `OPENAI_PRIORITY_MODEL` as Edge Function secrets. Neither belongs in `.env` values exposed to Vite.
4. Run `supabase/tests/hybrid_priority_scoring.sql` against a disposable database.

The Edge Function is invoked after a report is saved, so a provider timeout, malformed response, or rate limit does not block reporting. It records a marked deterministic `FALLBACK` instead. It only accepts calls by the report creator or staff, and its database writes use the Edge Function's service-role secret. The model only receives report context; it has no database credentials or tool access.

Manual staff review goes through `review_priority_analysis(challenge_uuid, corrected_factors, review_reason)`. It is audited and sets `priority_manual_override`, preventing later automatic updates from silently replacing the review.
