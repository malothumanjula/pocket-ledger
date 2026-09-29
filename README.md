# Pocket Ledger

A complete full-stack web application designed for personal finance tracking, featuring a custom handwritten frontend without frameworks and a robust Node.js/PostgreSQL backend as part of a clean separation architecture.

## Architecture Structure

```
pocket-ledger/
├── frontend/       ← HTML5 + CSS + Vanilla JS + Chart.js
├── backend/        ← Node.js + Express REST API
└── database/       ← PostgreSQL Schema (.sql)
```

## Setup Prerequisites
- **Node.js**: v16 or above
- **PostgreSQL**: v13 or above

## Step 1: Database Setup
1. Turn on your local PostgreSQL service.
2. Create a new database named `pocket_ledger`.
   ```bash
   createdb pocket_ledger
   ```
3. Load the schema from the repository.
   ```bash
   psql -d pocket_ledger -f database/schema.sql
   ```

## Step 2: Backend Setup
1. Change into the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Open `backend/.env` (or copy `.env.example`) and edit the `DATABASE_URL` to match your local postgres credentials:
   ```env
   DATABASE_URL=postgres://your_pg_user:your_pg_pass@localhost:5432/pocket_ledger
   ```
4. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The server will run on port 5000.*

## Step 3: Frontend Setup
1. Open a **new terminal tab** and change into the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install and run `serve` (via npx):
   ```bash
   npx serve .
   ```
   *The frontend will run on port 3000.*

---

## App Flow & Features

**User Scope:**
1. Navigate to [http://localhost:3000](http://localhost:3000)
2. You will be redirected to Log In or Register.
3. Access your Dashboard to manage your specific expenses, setup monthly budgets by category, and observe real-time generated Chart.js pie and trend bar graphs.
4. Top right corner includes light/dark theme toggles.

**Admin Scope:**
By default, new users have the `USER` role.
To make an admin: Open your PostgreSQL GUI or CLI, and run `UPDATE users SET role = 'ADMIN' WHERE email = 'YOUR_EMAIL';`. 

Log in as the admin, and visit [http://localhost:3000/admin.html](http://localhost:3000/admin.html) to view overall site metrics, recent site-wide transactions, and manipulate roles/delete rogue accounts.

## Architecture Compliance Notes
- Employs zero ORMs (No Prisma, Sequelize, etc.). Raw querying utilizes `pg`.
- Enforces strict separation of concerns (API strictly serves JSON; Frontend strictly consumes).
- No Docker images enforced.
- Built without frontend frameworks, adhering to raw DOM manipulation.
