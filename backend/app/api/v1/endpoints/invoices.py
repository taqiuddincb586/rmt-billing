from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import User, Invoice, Client, InvoiceStatus
from app.schemas.schemas import (
    InvoiceCreate, InvoiceUpdate, InvoiceResponse, PaymentCreate, PaymentResponse
)
from app.core.security import get_current_user
from app.services.invoice_service import InvoiceService, PDFService, EmailService

router = APIRouter()


@router.get("/", response_model=list[InvoiceResponse])
async def list_invoices(
    status: Optional[InvoiceStatus] = None,
    client_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Invoice)
        .where(Invoice.user_id == current_user.id)
        .options(
            selectinload(Invoice.client),
            selectinload(Invoice.line_items),
            selectinload(Invoice.payments),
        )
    )
    if status:
        query = query.where(Invoice.status == status)
    if client_id:
        query = query.where(Invoice.client_id == client_id)
    if start_date:
        query = query.where(Invoice.issue_date >= start_date)
    if end_date:
        query = query.where(Invoice.issue_date <= end_date)

    query = query.order_by(Invoice.issue_date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=InvoiceResponse, status_code=201)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify client
    client_result = await db.execute(
        select(Client).where(Client.id == data.client_id, Client.therapist_id == current_user.id)
    )
    if not client_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Client not found")

    invoice = await InvoiceService.create_invoice(db, current_user, data)
    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.user_id == current_user.id)
        .options(selectinload(Invoice.client), selectinload(Invoice.line_items))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.user_id == current_user.id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(invoice, key, value)
    await db.commit()
    await db.refresh(invoice)
    return invoice


@router.post("/{invoice_id}/generate-pdf")
async def generate_pdf(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.user_id == current_user.id)
        .options(selectinload(Invoice.line_items), selectinload(Invoice.client))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    client = invoice.client
    pdf_url = await PDFService.generate_pdf(invoice, current_user, client)
    invoice.pdf_url = pdf_url
    await db.commit()

    return {"pdf_url": pdf_url, "invoice_number": invoice.invoice_number}


@router.post("/{invoice_id}/send-email")
async def send_invoice_email(
    invoice_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice)
        .where(Invoice.id == invoice_id, Invoice.user_id == current_user.id)
        .options(selectinload(Invoice.line_items), selectinload(Invoice.client))
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if not invoice.client.email:
        raise HTTPException(status_code=400, detail="Client has no email address")

    # Generate PDF first if needed
    if not invoice.pdf_url:
        pdf_url = await PDFService.generate_pdf(invoice, current_user, invoice.client)
        invoice.pdf_url = pdf_url

    # Send email in background
    background_tasks.add_task(
        EmailService.send_invoice, invoice, invoice.client, current_user, invoice.pdf_url
    )

    from datetime import datetime
    invoice.status = InvoiceStatus.SENT
    invoice.sent_at = datetime.utcnow().isoformat()
    invoice.email_sent_to = invoice.client.email
    await db.commit()

    return {"message": f"Invoice sent to {invoice.client.email}"}


@router.post("/{invoice_id}/payments", response_model=PaymentResponse, status_code=201)
async def record_payment(
    invoice_id: int,
    data: PaymentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.user_id == current_user.id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    payment = await InvoiceService.record_payment(db, invoice, data)
    await db.commit()
    return payment


@router.delete("/{invoice_id}", status_code=204)
async def delete_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.user_id == current_user.id)
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.status == InvoiceStatus.PAID:
        raise HTTPException(status_code=400, detail="Cannot delete paid invoice")
    invoice.status = InvoiceStatus.CANCELLED
    await db.commit()
