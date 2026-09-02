# Field Ledger (Plan2Reality) - SIH 2026

An intelligent construction field operations and project ledger management platform.

## Overview

Field Ledger provides real-time field progress synchronization, 3D site scene visualization, critical path method (CPM) analysis, conflict detection, automated evidence matching, and role-based operational audit trails.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Radix UI, Lucide Icons, Three.js / React Three Fiber
- **Routing & State**: TanStack Router, TanStack React Query
- **Backend & Storage**: Supabase (Database, Auth, Storage)
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 20+
- npm, pnpm, or bun

### Installation

```bash
npm install
```

### Environment Setup

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Configure your Supabase credentials:
```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
VITE_SUPABASE_PROJECT_ID=<your-project-id>
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

## Deployment on Vercel

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com).
3. Set the Environment Variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).
4. Set the build command to `npm run build`.
5. Deploy!
