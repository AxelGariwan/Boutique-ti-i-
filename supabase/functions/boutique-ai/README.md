# Boutique ti i — AI Gateway

The `boutique-ai` Supabase Edge Function is the only entry point from the browser to AI providers.

## Current launch configuration

Use **Groq Free** as the only default provider. It is OpenAI-compatible, so the Edge Function sends standard chat-completion requests to Groq.

Required Supabase Edge Function secret:

- `GROQ_API_KEY`

Default model:

- `GROQ_MODEL=openai/gpt-oss-20b`

The model ID is configurable; verify the currently available model list and the account's free-tier rate limits in the Groq Console before production use.

Do not set `AI_ENABLE_OPENAI=true` for the free launch. OpenAI is an optional paid provider and is deliberately disabled unless explicitly opted in. The existing `OPENAI_API_KEY` secret can remain stored, but it will not be called by default.

Optional paid fallback (only after the owner explicitly enables billing):

- `OPENAI_API_KEY`, `AI_ENABLE_OPENAI=true`, `OPENAI_MODEL`, `OPENAI_INPUT_USD_PER_MILLION`, `OPENAI_OUTPUT_USD_PER_MILLION`

Optional providers (disabled unless explicitly enabled and configured with reviewed prices):

- Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_INPUT_USD_PER_MILLION`, `GEMINI_OUTPUT_USD_PER_MILLION`, and `AI_ENABLE_GEMINI=true`
- Mistral: `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `MISTRAL_INPUT_USD_PER_MILLION`, `MISTRAL_OUTPUT_USD_PER_MILLION`, and `AI_ENABLE_MISTRAL=true`

Optional controls:

- `AI_PROVIDER_ORDER=groq`
- `AI_MAX_REQUESTS_PER_USER_MONTH=60`

Groq Free usage is not charged, but it is subject to request/token rate limits. When a limit is reached, requests may fail with HTTP 429 until the limit resets. The internal USD 10 monthly budget remains a future application-level ceiling for paid providers; it is not a cash balance and does not override Groq's own free-tier limits. The function records zero provider spend for Groq Free.

## Deployment order

1. Review and run `20261108000200_ai_hybrid_gateway_budget.sql` manually in Supabase SQL Editor only after the migration has been checked against the live schema.
2. Add `GROQ_API_KEY` in Supabase Dashboard → Project Settings → Edge Functions → Secrets. Never put API keys in `index.html`, `script.js`, GitHub, or a chat message.
3. Deploy with Supabase CLI: `supabase functions deploy boutique-ai`.
4. Test with an approved vendor account on Pro/Premium, then test rejected accounts, Starter, suspended shops, quotas, and provider rate limits.
5. Only after these checks should the AI chat be merged into `main`.

The function sends only shop name, country, currency, product summaries, and aggregated order totals/statuses. It deliberately excludes customer names, phone numbers, addresses, payment details, and identity documents.
