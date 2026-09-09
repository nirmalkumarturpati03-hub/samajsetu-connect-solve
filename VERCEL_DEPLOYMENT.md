# Vercel deployment

This app uses TanStack Start with Nitro's `vercel` preset. The build produces Vercel Build Output API artifacts in `.vercel/output`; do not set a static output directory in Vercel.

## One-time setup

1. Import this repository into Vercel.
2. Keep the detected package manager as Bun. The configured build command is `bun run vercel-build`.
3. In **Project Settings → Environment Variables**, add these values for Production, Preview, and Development:

   ```text
   VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-publishable-key>
   ```

   These are browser-safe Supabase values. Do not add `SUPABASE_SERVICE_ROLE_KEY` or `OPENAI_API_KEY` to Vercel: the service role and OpenAI key remain only in Supabase Edge Function secrets.

4. Deploy. After changing either `VITE_` variable, redeploy because Vite embeds them at build time.

## Verification

Run locally before pushing:

```powershell
bun run vercel-build
```

The command must create `.vercel/output/config.json`. Vercel consumes that Build Output API directory automatically. Test an SSR route, anonymous report submission, Supabase authentication, and the `analyze-priority` Supabase Edge Function after deployment.

The Edge Function URL is supplied by the existing Supabase client; no Vercel rewrite or server-side proxy is required.
