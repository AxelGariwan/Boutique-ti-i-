# Boutique ti i — AI Gateway

The `boutique-ai` Supabase Edge Function is the only entry point from the browser to AI providers.

## Current launch configuration

Start with OpenAI only. Gemini and Mistral adapters are present but disabled until their API terms, paid data protection, and token prices have been reviewed.

Required Supabase Edge Function secrets:

- `OPENAI_API_KEY`
- `OPENAI_MODEL=gpt-6-luna`
- `OPENAI_INPUT_USD_PER_MILLION=0.10`
- `OPENAI_OUTPUT_USD_PER_MILLION=0.50`

Optional provider secrets (do not set these for the initial launch):

- Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_INPUT_USD_PER_MILLION`, `GEMINI_OUTPUT_USD_PER_MILLION`, and `AI_ENABLE_GEMINI=true`
- Mistral: `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `MISTRAL_INPUT_USD_PER_MILLION`, `MISTRAL_OUTPUT_USD_PER_MILLION`, and `AI_ENABLE_MISTRAL=true`

Optional controls:

- `AI_PROVIDER_ORDER=openai,gemini,mistral`
- `AI_MAX_REQUESTS_PER_USER_MONTH=60`

The SQL migration seeds a global monthly budget of **USD 10**. It creates a serialized reservation RPC so concurrent requests cannot all spend the remaining budget at once. Each user is limited to 60 requests per month by default. The application must keep the provider prices in the secrets synchronized with the provider's current published rates.

## Deployment order

1. Review and run `20261108000200_ai_hybrid_gateway_budget.sql` manually in Supabase SQL Editor.
2. Add the required secrets in Supabase Dashboard → Project Settings → Edge Functions → Secrets. Never put API keys in `index.html`, `script.js`, GitHub, or a chat message.
3. Deploy with Supabase CLI: `supabase functions deploy boutique-ai`.
4. Test with an approved vendor account on Pro/Premium, then test rejected accounts, Starter, suspended shops, quotas, and budget exhaustion.
5. Only after these checks should the AI chat be merged into `main`.

The function sends only shop name, country, currency, product summaries, and aggregated order totals/statuses. It deliberately excludes customer names, phone numbers, addresses, payment details, and identity documents.
