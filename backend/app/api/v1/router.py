from fastapi import APIRouter

from app.api.v1.endpoints import auth, users, clinics, clients, sessions, invoices, expenses, dashboard

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(clinics.router, prefix="/clinics", tags=["Clinics"])
api_router.include_router(clients.router, prefix="/clients", tags=["Clients"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Invoices"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
