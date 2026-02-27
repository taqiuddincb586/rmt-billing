import asyncio
from app.core.celery_app import celery_app
from app.db.session import AsyncSessionLocal
from app.services.invoice_service import InvoiceService


@celery_app.task
def check_overdue_invoices():
    """Daily task: mark past-due unpaid invoices as OVERDUE"""
    async def _run():
        async with AsyncSessionLocal() as db:
            await InvoiceService.check_overdue_invoices(db)

    asyncio.run(_run())
