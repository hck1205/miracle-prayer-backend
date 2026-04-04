# Prisma GUI Guide

## Quick Start

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `npm run db:up`.
3. Generate the Prisma client with `npm run prisma:generate`.
4. Create the schema with `npx prisma migrate dev --name init`.
5. Open the GUI with `npm run prisma:studio`.
6. Open `http://localhost:5555` in your browser.

## Current Access Status

- Prisma Studio is reachable at `http://localhost:5555`.
- If the page is already open, refresh it after schema changes.

## What You Will See

- Prisma Studio opens in a browser.
- The `User` model appears as a table-like view.
- You can browse, insert, and edit records directly for local development.

## Connection Info

- Host: `localhost`
- Port: `5432`
- Database: `ai_wedding`
- User: `postgres`
- Password: `postgres`

## Troubleshooting

- If `prisma:studio` cannot connect, make sure PostgreSQL is running on port `5432`.
- If Docker is not installed, install Docker Desktop first and start it before `npm run db:up`.
- If migration fails, verify `DATABASE_URL` in `.env`.
- If Studio is running but empty, confirm the schema has been applied to the database.
