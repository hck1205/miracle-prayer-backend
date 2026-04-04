# template-backend

NestJS + TypeScript login template backend with PostgreSQL, Prisma, Google sign-in verification, JWT access tokens, refresh token rotation, and logout support.

## What stays in the template

- Google login endpoint
- Access token issuance
- Refresh token rotation
- Logout endpoint
- Current user endpoint
- Health check endpoint

## API

```bash
GET /api/health
POST /api/v1/auth/google/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET /api/v1/auth/me
```

## Environment variables

```env
PORT=3000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_wedding?schema=public"
JWT_ACCESS_SECRET="change-me"
JWT_ACCESS_EXPIRES_IN="900"
JWT_REFRESH_SECRET="change-me-refresh"
JWT_REFRESH_EXPIRES_IN="604800"
GOOGLE_CLIENT_IDS="your-google-client-id.apps.googleusercontent.com"
FRONTEND_ORIGINS="http://localhost:5173,http://127.0.0.1:5173"
```

## Local setup

```bash
cp .env.example .env
npm install
npm run db:up
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run start:dev
```

## Commands

```bash
npm run db:up
npm run db:down
npm run db:logs
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:studio
npm run build
npm test
npm run test:e2e
```

## Notes

- The template keeps a single refresh-token session per user.
- Refresh tokens are stored as SHA-256 hashes, not raw token strings.
- The `User` model only includes fields used by the current login flow.