This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | SQLite path (e.g., `./data/ai-dnd.db`) | Yes |
| `AI_PROVIDER` | `ollama`, `openai`, `anthropic`, `deepseek` | Yes |
| `AI_BASE_URL` | AI API endpoint | Yes |
| `AI_MODEL` | AI model name | Yes |
| `AI_TIMEOUT` | AI timeout in seconds (default: 120) | No |
| `GITHUB_TOKEN` | GitHub token for feedback issues | No |
| `SESSION_SECRET` | Secret for session cookies | Yes |

### GitHub Token (for feedback system)

Generate at: **GitHub → Settings → Developer settings → Personal access tokens**

Required scope:
- `repo` - Full private repo access
- OR `public_repo` - Public repos only

## Getting Started

```bash
cp .env.example .env.local
# Edit .env.local with your values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

When deploying, add environment variables in the Vercel dashboard:
- Project → Settings → Environment Variables
- Add each variable from `.env.example`
# test
