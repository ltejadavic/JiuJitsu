# 🥋 Brazilian Jiu-Jitsu Academy Management & Scheduling System

An internal, high-reliability web platform tailored for Brazilian Jiu-Jitsu and martial arts academies. Centered on an **interactive FullCalendar**, the system streamlines daily mat scheduling, prevents instructor booking conflicts in real time, logs verified student attendance, tracks multi-dimensional training hours, and provides analytical business reporting with **multi-sheet Excel workbooks and embedded chart snapshots**.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**, **FullCalendar**, **TanStack Query v5**, **Lucide Icons**, **Zod**, **html-to-image** |
| **Backend** | **NestJS**, **TypeScript**, RESTful API, Global Validation Pipes, **Passport JWT** |
| **Database & ORM** | **MySQL 8.0**, **Prisma ORM** (UTC timestamps, compound constraints, soft deletes) |
| **Reporting & Backup** | **ExcelJS** (multi-tab `.xlsx` with graphical snapshots), Custom JSON Database Snapshot Engine |
| **Monorepo** | Independent `frontend/` and `backend/` services managed via npm workspaces |

---

## ⏱️ Mathematical Integrity: The 3 Time Dimensions

To ensure business reporting accuracy, the platform strictly differentiates and computes three non-interchangeable time dimensions:

1. **Mat Class Hours ($H_{class}$):** Elapsed chronological time of the session on the mat.  
   $$\sum \frac{\text{durationMinutes}}{60}$$
   *(Never multiplied by student attendance or instructor headcount).*
2. **Teaching Hours ($H_{teaching}$):** Real minutes taught by each individual instructor. Accommodates co-teaching, staggered shifts, or multi-coach sessions.  
   $$\sum \frac{\text{minutesTaught}}{60}$$
3. **Student Mat Hours ($H_{student}$):** Cumulative training volume received by students verified as `ATTENDED`.  
   $$\sum \frac{\text{minutesAttended}}{60}$$

---

## 🚀 Local Development Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or v20 LTS recommended)
- [Docker](https://www.docker.com/) & Docker Compose

### 2. Environment Configuration
Copy the template configuration into both the root workspace and the backend directory:
```bash
# From repository root
cp .env.example .env
cp .env.example backend/.env
```
> Open `.env` and `backend/.env` to configure your local database credentials, JWT secret key, and initial administrator credentials.

### 3. Start Local MySQL Database
```bash
docker compose up -d
```

### 4. Database Schema Push & Initial Seed
```bash
cd backend
npm install

# Push Prisma schema to MySQL
npm run prisma:push

# Seed academy settings, course catalog, subscription plans, and administrator
npm run prisma:seed
```

### 5. Launch the Platform
From the project root:
```bash
# Installs root, backend, and frontend dependencies
npm install

# Runs both backend (port 4000) and frontend (port 3000) concurrently
npm run dev
```

- **Frontend Application:** `http://localhost:3000`
- **Backend REST API:** `http://localhost:4000/api/v1`

---

## ☁️ Cloud Deployment Guide (Option 2: Vercel + Render + Managed MySQL)

This architecture separates the static/SSR frontend, the containerized API backend, and the managed database for optimal performance, security, and scalability.

```
┌─────────────────────────┐          ┌─────────────────────────┐          ┌─────────────────────────┐
│      Next.js Web        │  HTTPS   │       NestJS API        │  MySQL   │     Managed MySQL       │
│     (Vercel Edge)       ├─────────►│     (Render/Koyeb)      ├─────────►│     (Aiven Cloud)       │
│  academy-app.vercel.app │  REST    │ academy-api.onrender.com│  + SSL   │   mysql://...:3306      │
└─────────────────────────┘          └─────────────────────────┘          └─────────────────────────┘
```

### Step 1: Provision Managed MySQL Database (e.g. Aiven)
1. Create a free MySQL 8.0 instance on [Aiven.io](https://aiven.io/).
2. Copy the **Service URI** (e.g., `mysql://avnadmin:PASSWORD@HOST:PORT/defaultdb?ssl-mode=REQUIRED`).

### Step 2: Deploy Backend API on Render or Koyeb
1. Connect your Git repository to [Render](https://render.com/) as a **Web Service**.
2. Configure service settings:
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`
3. Add Environment Variables in the provider dashboard:
   - `NODE_ENV`: `production`
   - `PORT`: `4000` (or leave default, bound to `0.0.0.0`)
   - `DATABASE_URL`: Your Aiven MySQL connection string (`?ssl-mode=REQUIRED`)
   - `JWT_SECRET`: A secure random 32+ character string
   - `JWT_EXPIRES_IN`: `7d`
   - `CORS_ORIGINS`: `https://your-frontend-domain.vercel.app` (your Vercel URL)
   - `INITIAL_ADMIN_USERNAME`: Your desired admin username (e.g., `AdminDojo`)
   - `INITIAL_ADMIN_EMAIL`: Your administrator contact email
   - `INITIAL_ADMIN_PASSWORD`: A strong initial master password
4. Run initial database migration from Render Shell (or one-time build script):
   ```bash
   npx prisma db push
   npm run prisma:seed
   ```

### Step 3: Deploy Frontend on Vercel
1. Import your Git repository into [Vercel](https://vercel.com/).
2. Configure project settings:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** `frontend`
3. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://<your-backend-app>.onrender.com/api/v1`
4. Deploy. Vercel will automatically build and distribute the Next.js app to its global CDN.

---

## 🔒 Security & Disaster Recovery

- **Decoupled Secrets:** Zero passwords or sensitive connection strings exist in tracked source code. All credentials are provided at runtime via environment variables.
- **Strict Git Hygiene:** Sensitive environment files (`.env*`), planning documents (`PLAN.md`, `CONTINUITY.md`), local database volumes (`mysql_data/`), and build artifacts are strictly excluded by `.gitignore`.
- **JWT Authentication & HTTPS Security:** Authentication tokens are stored with `secure: true` (over HTTPS) and `sameSite: 'lax'`, transmitted to the API via `Authorization: Bearer <token>`.
- **Database Backup Engine:** The Administrator can download an instantaneous, complete relational backup snapshot (`.json`) at any time directly from the top navigation bar or the reports view.
- **Soft Deletion (`deletedAt`):** Students and instructors are softly deleted, preserving all historical class statistics, attended hours, and financial records.

---

## 📄 License
Internal proprietary license for Jiu-Jitsu Academy Operations.
