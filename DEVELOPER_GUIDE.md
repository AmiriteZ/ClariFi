# ClariFi Developer Guide

Welcome to the ClariFi developer documentation. This guide explains the technical architecture, code structure, and key workflows of the ClariFi personal finance platform.

## 🏗️ System Architecture

ClariFi follows a modern client-server architecture:

```mermaid
graph TD
    Client[Frontend (React/Vite)] <-->|REST API| Server[Backend (Node/Express)]
    Server <-->|SQL| DB[(PostgreSQL)]
    Server <-->|API| Yapily[Yapily Open Banking]
    Server <-->|API| OpenAI[OpenAI API]
    Client <-->|Auth| Firebase[Firebase Auth]
    Server <-->|Verify Token| Firebase
```

### Key Technologies

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand (State Management), Recharts (Visualization).
- **Backend**: Node.js, Express, TypeScript.
- **Database**: PostgreSQL (Relational data for users, accounts, transactions).
- **Authentication**: Hybrid approach using **Firebase Authentication** for identity management and **PostgreSQL** for user profile data.
- **Open Banking**: **Yapily API** for connecting to banks and fetching transactions.
- **AI/ML**: Custom logic and OpenAI integration for transaction categorization and insights.

---

## 📂 Directory Structure

### Frontend (`/src`)

The frontend is organized by features and common utilities:

- `src/components/`: Reusable UI components (buttons, inputs, cards).
- `src/features/`: Feature-specific logic and components (e.g., `budgets`, `goals`, `accounts`).
- `src/pages/`: Top-level page components corresponding to routes.
- `src/hooks/`: Custom React hooks.
- `src/lib/`: Core utilities (API client, Firebase setup).
  - `axios.ts`: Configured Axios instance for API requests.
  - `firebase.ts`: Firebase SDK initialization.

### Backend (`/server`)

The backend handles API requests, database interactions, and external integrations:

- `server/src/app.ts`: Express application setup and middleware.
- `server/src/server.ts`: Entry point (starts the server).
- `server/src/db.ts`: Database connection pool configuration.
- `server/src/routes/`: API route handlers.
  - `users.ts`: User profile management.
  - `accounts.ts`: Bank account linking and syncing.
  - `budgets.ts`: Budget creation and tracking.
  - `goals.ts`: Savings goals.
  - `ml.ts` & `ai.ts`: AI/ML endpoints.
- `server/src/middleware/`: Custom middleware (e.g., `verifyFirebaseToken`).
- `server/src/config/`: Configuration files (Yapily, etc.).
- `server/database/`: Database scripts.
  - `migrations/`: SQL files to create/update schema.
  - `seeds/`: Initial data (categories, institutions).

---

## 🔐 Authentication Flow

ClariFi uses a secure hybrid authentication flow:

1.  **Login**: User logs in on the frontend using Firebase Authentication.
2.  **Token**: Firebase returns an ID Token (JWT) to the frontend.
3.  **Request**: Frontend sends this token in the `Authorization` header (Bearer token) for every API request.
4.  **Verification**: The backend middleware (`verifyFirebaseToken`) verifies the token with Firebase Admin SDK.
5.  **User Context**:
    - The middleware extracts the `uid` (Firebase User ID).
    - It attaches the user info to `req.user`.
    - Routes query the `users` table in PostgreSQL using `firebase_uid` to get the internal `id`.

---

## 🏦 Open Banking Integration (Yapily)

Connecting a bank account involves a multi-step OAuth flow:

1.  **Initiate (`POST /api/accounts/connect`)**:
    - User selects an institution.
    - Backend calls Yapily to create an "Account Auth Request".
    - Backend returns an `authorisationUrl`.
2.  **Authorize**:
    - User is redirected to their bank's website/app to approve access.
3.  **Callback**:
    - Bank redirects user back to ClariFi frontend.
    - Frontend calls backend to finalize the connection.
4.  **Sync (`POST /api/accounts/sync/:connectionId`)**:
    - Backend exchanges the auth code for a **Consent Token**.
    - Backend uses the token to fetch accounts and transactions from Yapily.
    - Data is stored in `accounts` and `transactions` tables.

**Resyncing**:
The `/api/accounts/resync` endpoint iterates through all active connections, refreshes tokens if needed, and fetches the latest data.

---

## 🧠 AI & Machine Learning

The project includes AI-driven features located in `server/src/ml` and `server/src/ai`.

### 1. Recurring Transaction Detection (`ml/analyzer.ts`)

The system identifies bills and subscriptions using a heuristic approach:

- **Grouping**: Transactions are grouped by merchant.
- **Stability Check**: Checks if amounts are stable (within 10% variance).
- **Interval Check**: Calculates the average time between transactions to determine frequency (Weekly, Monthly, Yearly).
- **Categorization**: Uses a keyword list (e.g., "rent", "subscription", "insurance") to distinguish bills from regular recurring spending (like groceries).

### 2. Spending Analysis

- **Trends**: Compares last month's spending to the 3-month average to detect "increasing" or "decreasing" trends.
- **Cash Flow**: Calculates savings rate based on Income vs Expenses over the last 3 months.

### 3. Smart Categorization

- **OpenAI Integration**: The `ai/` module likely uses OpenAI to categorize transactions when simple rules fail, providing a more intelligent classification system.

### 4. AI Assistant Prompts (`server/src/ai/prompts.ts`)

The ClariFi Assistant is governed by a strict `SYSTEM_PROMPT` that defines its persona and capabilities:

- **Persona**: Warm, supportive, non-judgmental financial advisor.
- **Context Window**: By default, it analyzes the **last 90 days** of transaction data.
- **Domain Restriction**: Explicitly instructed to **refuse** non-financial questions (e.g., "How far is Mars?") to maintain focus and conserve tokens.
- **Input Data**: The `buildConversationPrompt` function injects the user's name, financial context (summarized data), and conversation history into the prompt.

---

## ⚛️ Frontend State Management

ClariFi uses **Zustand** for global state management, offering a simpler alternative to Redux.

### Auth Store (`src/store/auth.store.ts`)

- **Persistence**: Uses `persist` middleware to save the user session to `localStorage`.
- **State**: Tracks `user` object, `token` (JWT), and `isInitialized` status.
- **Actions**: `login` (updates state and storage) and `logout` (clears state and storage).

---

## 🗄️ Database Schema Details

The PostgreSQL database is normalized to handle complex financial relationships.

### Key Tables

#### `users`

- `id` (UUID): Internal primary key.
- `firebase_uid` (String): Link to Firebase Auth.
- `email`, `fname`, `lname`: Profile details.

#### `bank_connections`

- `id` (UUID): Unique connection ID.
- `user_id` (UUID): Owner.
- `institution_id` (Int): Link to `institutions` table.
- `external_id` (String): The **Consent ID** from Yapily.
- `status` (String): `active`, `expired`, etc.

#### `accounts`

- `id` (UUID): Internal account ID.
- `bank_connection_id` (UUID): Link to parent connection.
- `external_account_id` (String): Provider's account ID (safe to store).
- `current_balance`, `available_balance` (Numeric): Latest synced balances.
- `masked_account_ref` (String): Last 4 digits (e.g., `****1234`).

#### `transactions`

- `id` (UUID): Internal transaction ID.
- `account_id` (UUID): Link to source account.
- `external_tx_id` (String): Provider's transaction ID (used for de-duplication).
- `amount` (Numeric): Transaction value.
- `direction` (String): `debit` or `credit`.
- `category_id` (Int): Link to `categories` table.
- `merchant_name` (String): Cleaned merchant name.
- `is_subscription` (Boolean): Flagged by the ML analyzer.

---

## 🛠️ Backend Deep Dive

This section details complex logic implemented in the Node.js/Express backend.

### 1. Budget Logic (`routes/budgets.ts`)

#### Auto-Renewal System (`POST /renew-expired`)

Budgets can be set to auto-renew (Weekly/Monthly). The backend handles this via a specific workflow:

1.  **Detection**: Finds active budgets where `period_end < CURRENT_DATE` and `auto_renew = true`.
2.  **Archiving**: Marks the old budget as `completed` and sets `archived_at`.
3.  **Cloning**: Creates a NEW budget record with:
    - New `period_start` and `period_end` (shifted by 1 week or 1 month).
    - Same `limit_amount` and categories.
    - `parent_budget_id` linking back to the old budget for history tracking.
4.  **Carry-over**: Copies all `budget_items` (category limits) and `budget_members` to the new instance.

#### Budget Analytics (`GET /:id/view`)

The backend performs heavy lifting to calculate real-time budget health:

- **Burn Rate**: Calculates how fast money is being spent relative to the time elapsed in the period.
- **Health Status**:
  - `Healthy`: Spending is on track.
  - `Warning`: Spending is > 10% ahead of time elapsed.
  - `Danger`: Spending is > 20% ahead of time elapsed.
- **Projections**: Extrapolates current daily spending to predict end-of-period total and potential overage.

### 2. Goal Management (`routes/goals.ts`)

#### User Resolution

The system supports a hybrid identity model. The `resolveUserId` helper function ensures robust user lookup:

1.  Checks `req.user.id` (Internal DB ID).
2.  If missing, looks up `users` table using `req.user.uid` (Firebase UID).
3.  This ensures compatibility whether the request comes from a freshly authenticated client (Firebase UID only) or an internal process.

#### Contribution Tracking

Goals track progress through a separate `goal_contributions` table. The `percentComplete` is calculated dynamically on read:

```typescript
percentComplete = (totalContributed / targetAmount) * 100;
```

### 3. Configuration & Scripts

- **Yapily Config** (`config/yapily.ts`): Centralizes Open Banking credentials and endpoints.
- **Utility Scripts** (`scripts/`): Contains SQL scripts for database maintenance, seeding initial categories, and debugging bank connections.

---

## 🚀 Getting Started

To run the project locally:

1.  **Database**: Ensure PostgreSQL is running and the database is created (`clarifi`).
2.  **Environment**: Check `.env` files in root and `server/` for keys (Firebase, Yapily, DB URL).
3.  **Start**:
    - **Windows**: Run `startup.bat`.
    - **Manual**: Run `npm run dev` in root (frontend) and `npm run dev` in `server/` (backend).
