# Recall Cloud Backend API (Node.js + Express + Prisma + PostgreSQL)
> Scalable, production-grade cloud REST API powering **Recall: Smart Flashcards & Learning Companion**.

---

## ⚡ Tech Stack
* **Runtime:** Node.js (TypeScript)
* **Framework:** Express.js
* **ORM:** Prisma ORM
* **Database:** PostgreSQL (Cloud-hosted via Neon.tech, Supabase, or Render)
* **Security:** JWT Authentication (Bearer Tokens) + bcrypt password hashing + Zod schema validation
* **Algorithm:** SuperMemo-2 (SM-2) Spaced Repetition engine hosted server-side for cross-device consistency

---

## 🌐 24/7 Free Live Cloud Deployment Guide

To make your backend live on the public internet so the Flutter app can connect from **any phone, anywhere, anytime**:

### Step 1: Free Cloud PostgreSQL Database (Neon.tech or Supabase)
1. Go to [Neon.tech](https://neon.tech) (100% Free PostgreSQL, no credit card required).
2. Create a new project called `recall-db`.
3. Copy the pooled connection string, for example:
   ```text
   DATABASE_URL="postgresql://alex:abc123xyz@ep-sample-pooler.us-east-1.aws.neon.tech/recall_db?sslmode=require"
   ```

### Step 2: Test Locally with Prisma
```bash
# 1. Install dependencies
npm install

# 2. Push database schema to your cloud PostgreSQL
npx prisma db push

# 3. Start local development server
npm run dev
```

### Step 3: Free Live Hosting (Render.com or Railway.app)
1. Push your `recall-backend` folder to a GitHub repository.
2. Sign in to [Render.com](https://render.com) and click **New Web Service**.
3. Select your GitHub repository.
4. Set the following settings:
   * **Environment:** `Node`
   * **Build Command:** `npm install && npx prisma generate && npm run build`
   * **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   * `DATABASE_URL` = `<your-neon-postgres-url>`
   * `JWT_SECRET` = `<a-random-secure-secret-string>`
   * `NODE_ENV` = `production`
6. Click **Deploy**. Within 2 minutes, Render gives you a public live HTTPS URL, e.g.:
   ```text
   https://recall-api-xxxx.onrender.com
   ```
7. Paste this URL into `recall-frontend/lib/core/config/env_config.dart`.

---

## 📡 REST API v1 Reference

All authenticated endpoints require the header:  
`Authorization: Bearer <JWT_TOKEN>`

### Authentication
| Method | Endpoint | Description | Public? |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new account (name, email, password) | Yes |
| `POST` | `/api/v1/auth/login` | Sign in & receive 7-day JWT token | Yes |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile | No |

### Decks & Subjects
| Method | Endpoint | Description | Public? |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/decks` | List all user decks with card counts & due counts | No |
| `GET` | `/api/v1/decks/:id` | Get single deck details with all cards | No |
| `POST` | `/api/v1/decks` | Create a new deck | No |
| `PATCH` | `/api/v1/decks/:id/favorite` | Toggle deck favorite star | No |
| `DELETE` | `/api/v1/decks/:id` | Delete deck and all its flashcards | No |

### Flashcards
| Method | Endpoint | Description | Public? |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/cards` | Add new flashcard to a deck | No |
| `DELETE` | `/api/v1/cards/:id` | Delete flashcard | No |

### Spaced Repetition & Reviews
| Method | Endpoint | Description | Public? |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/reviews` | Submit card recall rating (`again`, `hard`, `good`, `easy`). Runs SM-2 and updates next review date | No |
| `GET` | `/api/v1/reviews/due` | Get all flashcards due for review today across all decks | No |

### Analytics & Weakness Radar
| Method | Endpoint | Description | Public? |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/analytics/overview` | Returns overall retention rate, SM-2 curve, and Weakness Radar (cards with failure rate $\ge 40\%$) | No |
