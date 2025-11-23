# ClariFi 💰

**ClariFi** is a modern, intelligent personal finance management platform designed to help individuals and households take control of their financial future. Built as a Final Year Project, ClariFi combines the power of **Open Banking** with **machine learning** to provide real-time financial insights, automated transaction categorization, and comprehensive budget tracking.

## 🎯 What Makes ClariFi Different?

Unlike traditional budgeting apps, ClariFi offers:

- **🔗 Seamless Bank Integration**: Connect directly to your bank accounts via Open Banking (Yapily API) for automatic transaction syncing—no manual CSV uploads needed
- **🤖 Smart Categorization**: ML-powered transaction categorization learns from your spending patterns to automatically organize expenses
- **🏠 Household Collaboration**: Manage shared finances with family or roommates while maintaining individual privacy
- **📊 Actionable Insights**: Visual analytics and spending trends help you understand where your money goes and make informed financial decisions
- **🎯 Goal-Oriented Savings**: Link your budgets directly to savings goals, automatically allocating surplus funds to what matters most
- **🔄 Auto-Renewing Budgets**: Set it and forget it—budgets automatically renew and archive, preserving historical performance data

Whether you're a student managing a tight budget, a professional planning for the future, or a household coordinating shared expenses, ClariFi provides the tools you need to achieve financial clarity and confidence.

## 🚀 Features

### 🏦 Open Banking Integration

- **Secure Bank Connections**: Connect multiple bank accounts through Yapily's Open Banking API
- **Real-Time Sync**: Automatically fetch and sync transactions from connected accounts
- **Multi-Institution Support**: Link accounts from various banks and financial institutions
- **Consent Management**: Full control over data access and permissions
- **Transaction Import**: Seamlessly import historical and new transactions

### 💳 Transaction Management

- **Automatic Categorization**: ML-powered intelligent categorization of transactions
- **Category Hierarchy**: Organize expenses with parent and child categories
- **Manual Override**: Edit categories and transaction details as needed
- **Search & Filter**: Advanced filtering by date, amount, category, and account
- **Transaction History**: Complete view of all financial activities
- **Bulk Operations**: Edit multiple transactions simultaneously

### 📊 Budget Planning

- **Flexible Budgets**: Create budgets for specific categories or overall spending
- **Auto-Renewal**: Set budgets to automatically renew monthly, quarterly, or yearly
- **Multi-Account Budgets**: Track budgets across multiple linked accounts
- **Budget Alerts**: Get notified when approaching or exceeding budget limits
- **Active vs Archived**: View current budgets separately from completed ones
- **Performance Tracking**: Monitor actual spending vs budgeted amounts
- **Savings Integration**: Allocate budget surplus to savings goals

### 🎯 Financial Goals

- **Savings Goals**: Set target amounts and deadlines for financial objectives
- **Progress Tracking**: Visual progress indicators showing completion percentage
- **Goal Contributions**: Manual or automatic contributions from budget savings
- **Multiple Goals**: Manage several goals simultaneously (emergency fund, vacation, etc.)
- **Goal History**: Track contribution history and milestone achievements
- **Target Dates**: Set deadlines to stay motivated and on track

### 👥 Household Management

- **Shared Finances**: Create households to manage finances with family or roommates
- **Member Roles**: Assign different permission levels to household members
- **Collaborative Budgets**: Share budgets and goals across household members
- **Combined View**: See aggregated financial data for the entire household
- **Individual Privacy**: Maintain personal accounts alongside shared ones

### 📈 Analytics & Insights

- **Spending Trends**: Visualize spending patterns over time with interactive charts
- **Category Breakdown**: Pie charts and graphs showing expense distribution
- **Income vs Expenses**: Track cash flow and net savings
- **Monthly Comparisons**: Compare spending across different time periods
- **Custom Reports**: Generate reports for specific date ranges and categories
- **Financial Health Score**: Overall assessment of financial wellness

### 🔐 Security & Privacy

- **Encrypted Storage**: All sensitive data encrypted at rest
- **Secure Authentication**: Password hashing with bcrypt
- **Session Management**: Secure session-based authentication
- **Open Banking Compliance**: Follows PSD2 and Open Banking standards
- **Data Control**: Full control over connected accounts and data sharing

## 🛠️ Tech Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Recharts** for data visualization
- **React Router** for navigation

### Backend

- **Node.js** with Express
- **TypeScript** for type safety
- **PostgreSQL** database
- **Yapily API** for Open Banking
- **bcrypt** for password hashing
- **express-session** for authentication

## 📁 Project Structure

```
ClariFi/
├── src/                      # Frontend React application
│   ├── components/          # Reusable UI components
│   ├── features/            # Feature-specific components
│   ├── pages/               # Page components
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utility functions
│
├── server/                   # Backend Express application
│   ├── src/                 # TypeScript source code
│   │   ├── routes/         # API route handlers
│   │   ├── config/         # Configuration files
│   │   └── index.ts        # Server entry point
│   ├── database/            # Database files
│   │   ├── migrations/     # SQL schema migrations
│   │   └── seeds/          # Database seed data
│   └── scripts/             # Utility scripts
│
└── public/                   # Static assets
```

## 🚦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/AmiriteZ/ClariFi.git
   cd ClariFi
   ```

2. **Install dependencies**

   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Add your frontend environment variables here
   ```

   Create a `.env` file in the `server` directory:

   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/clarifi
   SESSION_SECRET=your-session-secret
   YAPILY_APPLICATION_ID=your-yapily-app-id
   YAPILY_APPLICATION_SECRET=your-yapily-secret
   PORT=3000
   ```

4. **Set up the database**

   ```bash
   cd server
   # Run migrations
   psql -U your_username -d clarifi -f database/migrations/institutions_banks_accounts.sql
   # Add other migrations as needed

   # Run seeds
   psql -U your_username -d clarifi -f database/seeds/Categories_Fill.sql
   psql -U your_username -d clarifi -f database/seeds/seed_institutions.sql
   ```

### Running the Application

#### Option 1: Quick Start (Windows)

Use the provided startup script that automatically opens both frontend and backend in separate terminal windows:

```bash
startup.bat
```

> **Note**: The `startup.bat` script uses relative paths and will work from any installation location. No configuration needed!

#### Option 2: Manual Start

Run frontend and backend separately in different terminals:

**Frontend:**

```bash
npm run dev
```

**Backend:**

```bash
cd server
npm run dev
```

The application will be available at:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

## 📊 Database Scripts

### Migrations

Located in `server/database/migrations/`:

- Schema definitions for budgets, transactions, goals, accounts, etc.

### Seeds

Located in `server/database/seeds/`:

- Initial category data
- Institution/bank data
- Yapily category mappings

### Utility Scripts

Located in `server/scripts/`:

- Database inspection and debugging tools
- Migration runners
- Data verification scripts

## 🔐 Security

- Passwords are hashed using bcrypt
- Session-based authentication
- Secure Open Banking integration via Yapily
- Environment variables for sensitive data

## 🤝 Contributing

This is a Final Year Project. Contributions, issues, and feature requests are welcome!

## 📝 License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International License** (CC BY-NC 4.0).

This means:

- ✅ You can share and adapt the code for non-commercial purposes
- ✅ You must give appropriate credit
- ✅ You must indicate if changes were made
- ❌ You may not use the material for commercial purposes

See the [LICENSE](LICENSE) file for full details or visit [Creative Commons BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/).

## 👤 Author

**Arser**

- GitHub: [@AmiriteZ](https://github.com/AmiriteZ)

## 🙏 Acknowledgments

- Yapily for Open Banking API
- React and Vite communities
- PostgreSQL team

---

Built with ❤️ as a Final Year Project
