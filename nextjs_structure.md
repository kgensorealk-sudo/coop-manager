# Next.js 14+ App Router Structure for CoopManager

This structure is designed for scalability, separating concerns between UI, Data Fetching, and Business Logic.

```
/
├── .env.local                  # Environment variables (SUPABASE_URL, SUPABASE_ANON_KEY)
├── .gitignore                  # MUST include .env.local
├── middleware.ts               # Supabase Auth Middleware (protects routes)
├── types/
│   ├── index.ts                # Shared TypeScript interfaces (User, Loan, etc.)
│   └── database.types.ts       # Generated Supabase types
├── lib/
│   └── supabase/
│       ├── client.ts           # Client-side Supabase client
│       └── server.ts           # Server-side Supabase client (cookies)
├── components/
│   ├── ui/                     # Reusable UI atoms (Buttons, Cards, Inputs)
│   ├── dashboard/              # Dashboard specific components
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   └── LoanApprovalModal.tsx
│   └── auth/                   # Login/Signup forms
├── app/
│   ├── layout.tsx              # Root Layout (Fonts, Global Providers)
│   ├── page.tsx                # Landing Page
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx        # Login Page
│   │   └── callback/
│   │       └── route.ts        # Auth Callback for PKCE
│   └── dashboard/
│       ├── layout.tsx          # Dashboard Layout (Sidebar wrapper)
│       ├── page.tsx            # Main Admin Overview (Protected)
│       ├── loans/
│       │   └── page.tsx        # Loan Management
│       ├── members/
│       │   └── page.tsx        # Member Directory
│       └── treasury/
│           └── page.tsx        # Contributions view
└── utils/
    └── calculations.ts         # Interest helpers, date formatters
```

## GitHub Best Practices
1. **Never commit `.env.local`**. Add it to your `.gitignore`.
2. Push the Types and UI components as initial commit.
3. Set up GitHub Actions for linting.

## Middleware Logic
The `middleware.ts` should check if a user is authenticated.
1. If no session: Redirect to `/auth/login`.
2. If session exists but role != 'admin': Redirect to member dashboard (or block admin routes).
