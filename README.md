# Plan vs Actual Tracker

A modernized, enterprise-grade web application to set monthly spending targets per category, log actual transactions, review comparative reports (plan vs. actual with variance), and enforce locked periods.

**Demo Credentials (after setup):** `one@one.com` / `demo1234`

---

## 🛠️ Technology Stack

| Layer | Choice | Rationale |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15** (App Router), React 19, TypeScript | Unified development stack with server route handlers and client UI components. |
| **Styling** | **Tailwind CSS v4** + Custom Enterprise CSS | High-fidelity theme with smooth transitions, modern focus rings, and glassmorphism cards. |
| **Fonts** | Google Fonts (**Plus Jakarta Sans** & **Geist Mono**) | Refined typography: Plus Jakarta Sans for primary text and Geist Mono for tabular numeric data. |
| **Database** | **MongoDB Atlas** + **Mongoose ORM** | Object modeling with strong schema constraints, transactional imports, and automated index registration. |
| **Authentication** | Custom JSON Web Tokens (JWT) inside `httpOnly` Cookies | Secure, lightweight authentication to ensure complete user-data isolation. |
| **Charts** | **Recharts** | Interactive charts for monthly net variance and category totals. |
| **Testing** | **Vitest** | Full unit and integration test suite covering database queries, CSV processing, and lock validation. |

---

## 📝 Answers to Requirements & Edge Cases

### 1. How Variance % is Calculated when Plan is Zero
* **Formula:** `(Actual − Plan) / Plan × 100`
* **Plan is 0:** The percentage is `null` and rendered as **`N/A`** (and outputted as `N/A` in CSV exports).
* **Behavior:** The absolute variance (e.g. `+$250.00` if actual is 250) is still displayed. A plan of 0 with actual of 0 also returns `N/A` rather than `0%` to properly denote the lack of target base.

### 2. How Missing Actuals are Displayed
* **Treated as `0`:** Consistently handled across reporting tables, variance maths, and charts.
* **Math Outcomes:**
  * Actual: `$0.00`
  * Variance: `−Plan` (e.g., a `$5,000` plan with missing actual results in `-$5,000.00`)
  * Variance %: `−100.00%`
* **UX Treatment:** The system displays a subtle **`no entries`** badge alongside the `$0.00` actual to distinguish a true logged zero from a missing transaction entry.

### 3. Locking Behavior & Granularity
* **Granularity:** Enforced at the **Month (`YYYY-MM`)** level.
* **Quarterly Locks:** Exists as sugar in the API/UI. Selecting a quarter lock writes the three constituent month lock records under the hood.
* **Server-Side Enforcement:** Every mutating endpoint calls `assertMonthUnlocked()`. Any modify, delete, or CSV import request to a locked period fails immediately with an `HTTP 423 Locked` response containing a structured `PERIOD_LOCKED` error.
* **Import Atomicity:** If a CSV import contains even one row touching a locked month, the entire transaction is rolled back.

### 4. Assumptions & Tradeoffs
* **Currency:** Standard USD display. All monetary amounts are stored as integers in **cents** (`amountCents`) to completely bypass floating-point rounding errors.
* **Period Storage:** Expressed strictly as lexicographical strings (`"YYYY-MM"`). This makes queries direct string range matches (`$gte` / `$lte`), avoiding timezone offset errors.
* **Case-Insensitive Categories:** Category names are unique per user case-insensitively, preventing duplicate entries like `marketing` and `Marketing`.

---

## 🚀 Setup & Installation

### Prerequisites
* **Node.js 20 or newer**
* **MongoDB Atlas Cluster** (A replica set cluster is required because CSV uploads utilize Multi-Document Transactions).

### 1. Environment Setup
Clone the project, copy the environment template, and install packages:
```bash
npm install
cp .env.example .env.local
```

Define the following environment variables inside `.env`:
* `DATABASE_URL`: Your MongoDB Atlas replica set connection string.
* `AUTH_SECRET`: A secure key of 16+ characters for signing auth tokens.

### 2. Database Initialization
Compile the database models, register indexes, and seed sample data:
```bash
npm run setup
```

### 3. Running Locally
Start the Next.js development server:
```bash
npm run dev
```
Open **http://localhost:3000** to interact with the dashboard.

---

## 🧪 Testing Suite
Run the test suite:
```bash
npm test
```
The test suite consists of **82 tests** covering:
* `report.test.ts`: Target arithmetic, cell combinations, variance math, and user isolation.
* `locks.test.ts`: Integration tests verifying lock blocks on edits, page moves, and transaction rollbacks.
* `csv.test.ts`: Validations, headers, and BOM/CRLF character handling.
* `period.test.ts` & `money.test.ts`: Cent/float conversion precision and chronological ranges.

---

## 📈 Performance & Scaling Strategies
1. **Direct Aggregation:** Reports are pre-aggregated inside the MongoDB query stage using `$match` and `$group` pipelines, limiting data transfer to active cells rather than raw transactions.
2. **Covered Indexes:** Schema fields are covered by composite indexes (e.g. `(userId, month, categoryId)`) to fulfill queries from index maps alone.
3. **Pre-aggregation for Lock Events:** When a month is locked, its totals can be computed and written to a separate `locked_month_summaries` collection, eliminating database reads during dashboard rendering.
