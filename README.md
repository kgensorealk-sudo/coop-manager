
# The 13th Page

A comprehensive management dashboard for cooperative societies featuring loan approval workflows with custom interest rates, member equity tracking, and treasury management.

## Features

- **Role-based Access:** Admin and Member dashboards.
- **Loan Management:** Application, review, approval (with custom rates), and repayment tracking.
- **Treasury:** Track contributions, disbursements, and calculate financial position.
- **Real-time Data:** Powered by Supabase.

## Getting Started

1. **Clone the repository**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Run locally:**
   ```bash
   npm run dev
   ```

## Database Setup

This project uses **Supabase**.
1. Create a new Supabase project.
2. Go to the SQL Editor.
3. Copy the SQL Schema found in `components/DeveloperGuide.tsx` (or the Developer Guide tab in the app).
4. Run the SQL to create tables.
5. In the app, click the "Settings" gear icon on the login screen and enter your Supabase URL and Anon Key.
