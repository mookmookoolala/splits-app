# Splits

Splits is a full-stack expense-sharing application for tracking group spending,
settling balances and keeping a shared activity history. It is built as an
installable PWA with a React client, an Express API and PostgreSQL persistence.

## Highlights

- Create groups, invite members and split expenses
- Track balances and simplify multi-person debts
- Record settlements and confirmation activity
- Installable PWA with responsive mobile and desktop layouts
- Structured JSON logging and Prometheus metrics
- Prisma migrations and an automated CI build

## Stack

- React 19, TypeScript, Vite and Tailwind CSS
- Express 5 and Prisma
- PostgreSQL
- Prometheus-compatible metrics and Grafana dashboard
- GitHub Actions

## Run locally

Requirements: Node.js 22+ and PostgreSQL.

```bash
git clone https://github.com/mookmookoolala/splits-app.git
cd splits-app
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run dev
```

The web client runs at `http://localhost:5173` and the API at
`http://localhost:3001`.

## Configuration

| Variable | Purpose | Example |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | See `.env.example` |
| `PORT` | API port | `3001` |
| `CORS_ORIGIN` | Comma-separated allowed origins | `http://localhost:5173` |
| `PUBLIC_APP_URL` | Public URL used in shared messages | `http://localhost:5173` |

Never commit a real `.env` file, database dump or deployment credential.

## Quality checks

```bash
npm run lint
npm run build:all
```

## Security note

This repository is a portfolio project, not a production-ready financial
system. Passwords are hashed using Node's `scrypt`; production deployments
should additionally implement sessions or signed tokens, authorization checks,
rate limiting, CSRF protection and a managed secrets workflow.

## License

[MIT](LICENSE)
