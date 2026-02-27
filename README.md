# RMT Billing Management System

Production-ready billing management for independent Registered Massage Therapists (RMTs).

## Architecture Overview

```
rmt-billing/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/v1/endpoints/  # REST API endpoints (auth, clients, sessions, invoices, expenses, dashboard)
│   │   ├── core/              # Config, security (JWT), logging
│   │   ├── db/                # SQLAlchemy async engine + base model
│   │   ├── models/            # MySQL database models (ORM)
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   └── services/          # Business logic (invoice generation, PDF, email)
│   ├── alembic/               # Database migrations
│   └── requirements.txt
├── frontend/                   # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── pages/             # Dashboard, Clients, Sessions, Invoices, Expenses, Clinics, Profile
│   │   ├── components/        # Reusable UI (Layout, Modal)
│   │   ├── hooks/             # useAuth context
│   │   └── services/          # Axios API client
│   └── package.json
├── docker/                     # Docker configs (MySQL init)
├── docker-compose.yml          # Full stack orchestration
└── .env.example               # Environment template
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI 0.111, Python 3.12 |
| Database | MySQL 8.0 + SQLAlchemy 2.0 async |
| Auth | JWT (python-jose) + bcrypt |
| Task Queue | Celery + Redis |
| PDF | WeasyPrint + Jinja2 |
| Email | aiosmtplib (SMTP) |
| Frontend | React 18 + Vite + TailwindCSS |
| State | TanStack Query v5 |
| Charts | Recharts |
| Containers | Docker + Docker Compose |

## Features

### Core
- **JWT Authentication** — Secure login/register with refresh tokens
- **Multi-clinic support** — Track sessions across multiple clinic locations
- **Client management** — Full CRUD with insurance info, billing preferences
- **Session records** — SOAP notes, treatment types, duration, rates
- **Invoice generation** — Automatic from sessions, manual line items, HST calculation
- **PDF invoices** — Professional WeasyPrint PDF with therapist branding
- **Email sending** — Background task via aiosmtplib (SMTP)
- **Payment tracking** — Multi-payment support, automatic status updates
- **Invoice status** — Draft → Sent → Paid / Overdue / Cancelled
- **Expense tracking** — Categorized, tax-deductible flagging
- **Dashboard analytics** — Revenue vs expenses, top clients, invoice status breakdown

### Technical
- Async SQLAlchemy 2.0 (aiomysql driver)
- Background task queue (Celery + Redis) for email/scheduling
- Automatic overdue invoice detection (Celery Beat scheduler)
- Pagination on all list endpoints
- Soft deletes for clients and clinics
- Per-user invoice numbering with custom prefix

## Quick Start

### 1. Clone and configure

```bash
git clone <repo>
cd rmt-billing
cp .env.example .env
# Edit .env with your SMTP credentials and secrets
```

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

Services:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs
- MySQL: localhost:3306

### 3. Development (without Docker)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

```
POST   /api/v1/auth/register       — Register new therapist
POST   /api/v1/auth/login          — Login (returns JWT)
GET    /api/v1/auth/me             — Current user

GET    /api/v1/clinics             — List clinics
POST   /api/v1/clinics             — Create clinic

GET    /api/v1/clients             — List clients (search, filter)
POST   /api/v1/clients             — Create client
GET    /api/v1/clients/{id}        — Get client
PUT    /api/v1/clients/{id}        — Update client

GET    /api/v1/sessions            — List sessions (filter by client, clinic, date, unbilled)
POST   /api/v1/sessions            — Create session
PUT    /api/v1/sessions/{id}       — Update session

GET    /api/v1/invoices            — List invoices (filter by status, client, date)
POST   /api/v1/invoices            — Create invoice (with sessions and/or line items)
POST   /api/v1/invoices/{id}/generate-pdf   — Generate PDF
POST   /api/v1/invoices/{id}/send-email     — Send PDF via email
POST   /api/v1/invoices/{id}/payments       — Record payment

GET    /api/v1/expenses            — List expenses
POST   /api/v1/expenses            — Create expense

GET    /api/v1/dashboard/stats     — Analytics (revenue, net income, charts)
```

## Invoice Flow

```
Sessions recorded
      ↓
Create Invoice → link session IDs (auto creates line items)
      ↓
Generate PDF (WeasyPrint)
      ↓
Send via Email (background task)
      ↓
Status: DRAFT → SENT
      ↓
Record Payment → Status: PAID
      ↓
[Celery Beat] → Auto-mark OVERDUE if past due date
```

## Configuration

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | MySQL connection string |
| `SECRET_KEY` | JWT signing key (min 32 chars) |
| `SMTP_HOST/PORT/USER/PASSWORD` | Email sending |
| `FROM_EMAIL` | Sender email address |
| `REDIS_URL` | Celery broker |

## Security

- Passwords hashed with bcrypt
- JWT access tokens (60 min) + refresh tokens (7 days)
- All endpoints require authentication
- Multi-tenant: users only access their own data
- SQL injection protected via SQLAlchemy ORM
- CORS configured for frontend origin only

## Database Schema

Core tables: `users`, `clinics`, `clients`, `sessions`, `invoices`, `invoice_line_items`, `payments`, `expenses`

All tables include `id`, `created_at`, `updated_at` via shared Base class.

## License

MIT
