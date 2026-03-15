# API Provider Documentation Registry

## Provider Lookup Table

Use this table to find the correct documentation site for a detected SDK/API. Match by import name or package name.

| Import / Package | Provider | Doc Base URL | Search Method |
|---|---|---|---|
| `anthropic`, `@anthropic-ai/sdk`, `claude` | Anthropic | `https://docs.anthropic.com` | WebSearch: `site:docs.anthropic.com {query}` |
| `openai` | OpenAI | `https://platform.openai.com/docs` | WebSearch: `site:platform.openai.com/docs {query}` |
| `google.generativeai`, `@google/generative-ai`, `vertexai` | Google AI | `https://ai.google.dev/gemini-api/docs` | WebSearch: `site:ai.google.dev {query}` |
| `stripe` | Stripe | `https://docs.stripe.com` | WebSearch: `site:docs.stripe.com {query}` |
| `twilio` | Twilio | `https://www.twilio.com/docs` | WebSearch: `site:twilio.com/docs {query}` |
| `firebase_admin`, `firebase`, `@firebase` | Firebase | `https://firebase.google.com/docs` | WebSearch: `site:firebase.google.com/docs {query}` |
| `supabase`, `@supabase/supabase-js` | Supabase | `https://supabase.com/docs` | WebSearch: `site:supabase.com/docs {query}` |
| `boto3`, `@aws-sdk` | AWS | `https://docs.aws.amazon.com` | WebSearch: `site:docs.aws.amazon.com {query}` |
| `resend` | Resend | `https://resend.com/docs` | WebSearch: `site:resend.com/docs {query}` |
| `replicate` | Replicate | `https://replicate.com/docs` | WebSearch: `site:replicate.com/docs {query}` |
| `pinecone` | Pinecone | `https://docs.pinecone.io` | WebSearch: `site:docs.pinecone.io {query}` |
| `langchain` | LangChain | `https://python.langchain.com/docs` | WebSearch: `site:python.langchain.com {query}` |
| `prisma`, `@prisma/client` | Prisma | `https://www.prisma.io/docs` | WebSearch: `site:prisma.io/docs {query}` |
| `clerk`, `@clerk` | Clerk | `https://clerk.com/docs` | WebSearch: `site:clerk.com/docs {query}` |
| `cohere` | Cohere | `https://docs.cohere.com` | WebSearch: `site:docs.cohere.com {query}` |
| `together` | Together AI | `https://docs.together.ai` | WebSearch: `site:docs.together.ai {query}` |
| `mistralai` | Mistral | `https://docs.mistral.ai` | WebSearch: `site:docs.mistral.ai {query}` |
| `groq` | Groq | `https://console.groq.com/docs` | WebSearch: `site:console.groq.com/docs {query}` |
| `plaid` | Plaid | `https://plaid.com/docs` | WebSearch: `site:plaid.com/docs {query}` |
| `sendgrid`, `@sendgrid` | SendGrid | `https://docs.sendgrid.com` | WebSearch: `site:docs.sendgrid.com {query}` |
| `shopify`, `@shopify` | Shopify | `https://shopify.dev/docs` | WebSearch: `site:shopify.dev/docs {query}` |
| `axios` | Axios | `https://axios-http.com/docs` | WebSearch: `site:axios-http.com/docs {query}` |
| `next`, `next/` | Next.js | `https://nextjs.org/docs` | WebSearch: `site:nextjs.org/docs {query}` |
| `react` | React | `https://react.dev` | WebSearch: `site:react.dev {query}` |

## For Unknown Providers

If the import/package is not in the table above:
1. WebSearch: `{package_name} API documentation official`
2. Look for the official docs URL in the search results
3. Then WebSearch: `site:{docs_url} {specific_query}`
