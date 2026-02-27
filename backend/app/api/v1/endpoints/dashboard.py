from datetime import date, timedelta
from calendar import monthrange
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, extract

from app.db.session import get_db
from app.models.models import User, Invoice, Session, Client, Expense, InvoiceStatus, ExpenseCategory
from app.schemas.schemas import DashboardStats
from app.core.security import get_current_user

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    today = date.today()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)

    # Total revenue (paid invoices)
    revenue_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.amount_paid), 0))
        .where(Invoice.user_id == current_user.id, Invoice.status == InvoiceStatus.PAID)
    )
    total_revenue = float(revenue_result.scalar() or 0)

    # Total expenses
    expense_result = await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .where(Expense.user_id == current_user.id)
    )
    total_expenses = float(expense_result.scalar() or 0)

    # Outstanding balance
    outstanding_result = await db.execute(
        select(func.coalesce(func.sum(Invoice.balance_due), 0))
        .where(
            Invoice.user_id == current_user.id,
            Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE])
        )
    )
    outstanding_balance = float(outstanding_result.scalar() or 0)

    # Sessions this month
    sessions_result = await db.execute(
        select(func.count(Session.id))
        .join(Client, Session.client_id == Client.id)
        .where(
            Client.therapist_id == current_user.id,
            Session.date >= month_start,
        )
    )
    sessions_this_month = int(sessions_result.scalar() or 0)

    # Unpaid invoices
    unpaid_result = await db.execute(
        select(func.count(Invoice.id))
        .where(Invoice.user_id == current_user.id, Invoice.status == InvoiceStatus.SENT)
    )
    invoices_unpaid = int(unpaid_result.scalar() or 0)

    # Overdue invoices
    overdue_result = await db.execute(
        select(func.count(Invoice.id))
        .where(Invoice.user_id == current_user.id, Invoice.status == InvoiceStatus.OVERDUE)
    )
    invoices_overdue = int(overdue_result.scalar() or 0)

    # New clients this month
    new_clients_result = await db.execute(
        select(func.count(Client.id))
        .where(
            Client.therapist_id == current_user.id,
            Client.created_at >= month_start,
        )
    )
    new_clients_this_month = int(new_clients_result.scalar() or 0)

    # Revenue by month (last 12 months)
    revenue_by_month = []
    for i in range(11, -1, -1):
        target = today.replace(day=1) - timedelta(days=i * 30)
        m_start = target.replace(day=1)
        _, last_day = monthrange(m_start.year, m_start.month)
        m_end = m_start.replace(day=last_day)

        rev_result = await db.execute(
            select(func.coalesce(func.sum(Invoice.total), 0))
            .where(
                Invoice.user_id == current_user.id,
                Invoice.issue_date >= m_start,
                Invoice.issue_date <= m_end,
                Invoice.status != InvoiceStatus.CANCELLED,
            )
        )
        exp_result = await db.execute(
            select(func.coalesce(func.sum(Expense.amount), 0))
            .where(
                Expense.user_id == current_user.id,
                Expense.date >= m_start,
                Expense.date <= m_end,
            )
        )
        revenue_by_month.append({
            "month": m_start.strftime("%b %Y"),
            "revenue": float(rev_result.scalar() or 0),
            "expenses": float(exp_result.scalar() or 0),
        })

    # Top clients by revenue
    top_clients_result = await db.execute(
        select(Client.first_name, Client.last_name, func.sum(Invoice.total).label("total"))
        .join(Invoice, Invoice.client_id == Client.id)
        .where(
            Client.therapist_id == current_user.id,
            Invoice.status != InvoiceStatus.CANCELLED,
        )
        .group_by(Client.id)
        .order_by(func.sum(Invoice.total).desc())
        .limit(5)
    )
    top_clients = [
        {"name": f"{r[0]} {r[1]}", "total": float(r[2] or 0)}
        for r in top_clients_result.fetchall()
    ]

    # Expenses by category
    cat_result = await db.execute(
        select(Expense.category, func.sum(Expense.amount).label("total"))
        .where(Expense.user_id == current_user.id)
        .group_by(Expense.category)
        .order_by(func.sum(Expense.amount).desc())
    )
    expense_by_category = [
        {"category": r[0].value, "total": float(r[1] or 0)}
        for r in cat_result.fetchall()
    ]

    # Invoice status breakdown
    status_result = await db.execute(
        select(Invoice.status, func.count(Invoice.id).label("count"))
        .where(Invoice.user_id == current_user.id)
        .group_by(Invoice.status)
    )
    invoice_status_breakdown = {r[0].value: r[1] for r in status_result.fetchall()}

    return DashboardStats(
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        net_income=total_revenue - total_expenses,
        outstanding_balance=outstanding_balance,
        sessions_this_month=sessions_this_month,
        invoices_unpaid=invoices_unpaid,
        invoices_overdue=invoices_overdue,
        new_clients_this_month=new_clients_this_month,
        revenue_by_month=revenue_by_month,
        top_clients=top_clients,
        expense_by_category=expense_by_category,
        invoice_status_breakdown=invoice_status_breakdown,
    )
