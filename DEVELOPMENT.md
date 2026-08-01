# POS MVP — Local Development Setup

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac/Linux)
- Node.js 20+
- pnpm (`npm install -g pnpm`)

---

## 1. Start the Database

From the **`point-of-sales/`** folder (where `docker-compose.yml` lives):

```bash
docker compose up -d
```

This starts a PostgreSQL 16 container on `localhost:5432`.

Verify it's running:
```bash
docker compose ps
# postgres   running (healthy)
```

---

## 2. Configure Environment Variables

From the **`app/`** folder:

```bash
cp .env.local.example .env
```

The `.env` file is pre-configured for the local Docker PostgreSQL — no changes needed.

> For production, replace `DATABASE_URL` with your Supabase connection string.

---

## 3. Install Dependencies

```bash
cd app
pnpm install
```

---

## 4. Run Database Migrations

```bash
# Generate Prisma client
node node_modules/prisma/build/index.js generate

# Create all tables
node node_modules/prisma/build/index.js migrate dev --name init

# Seed with sample data
node node_modules/prisma/build/index.js db seed
```

After seeding, test credentials are:
- **Admin** → `admin@pos.local` / `admin123`
- **Cashier** → `cashier@pos.local` / `cashier123`

---

## 5. Start the App

```bash
pnpm dev
# or
node_modules/.bin/next.cmd dev   # Windows direct
```

Open [http://localhost:3000](http://localhost:3000)

---

## 6. Optional: pgAdmin UI

```bash
# Start pgAdmin (only when needed)
docker compose --profile tools up -d pgadmin
```

Open [http://localhost:5050](http://localhost:5050)
- Email: `admin@pos.local`
- Password: `admin`

Add a server:
- Host: `postgres` (service name inside Docker network)
- Port: `5432`
- Database: `posdb`
- Username: `posuser`
- Password: `pospassword`

---

## Useful Commands

```bash
# Stop containers
docker compose down

# Stop + wipe database (full reset)
docker compose down -v

# View logs
docker compose logs -f postgres

# Open psql shell
docker exec -it pos-postgres psql -U posuser -d posdb
```

---

## Stack

| Component | Local Dev | Production |
|---|---|---|
| Database | Docker PostgreSQL 16 | Supabase PostgreSQL 16 |
| File Storage | Disabled (no R2 keys) | Cloudflare R2 |
| Rate Limiting | Disabled (no Upstash) | @upstash/ratelimit |
