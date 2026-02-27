"""
Invoice Service - Core business logic for invoice management
"""
import os
import re
from datetime import date, timedelta
from typing import List, Optional
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.models.models import Invoice, InvoiceLineItem, Session, Client, User, InvoiceStatus, Payment
from app.schemas.schemas import InvoiceCreate, PaymentCreate
from app.core.config import settings


class InvoiceService:

    @staticmethod
    async def get_next_invoice_number(db: AsyncSession, user: User) -> str:
        """Generate sequential invoice number"""
        counter = user.invoice_counter
        await db.execute(
            update(User).where(User.id == user.id).values(invoice_counter=counter + 1)
        )
        return f"{user.invoice_prefix}-{counter:04d}"

    @staticmethod
    async def create_invoice(
        db: AsyncSession,
        user: User,
        data: InvoiceCreate
    ) -> Invoice:
        invoice_number = await InvoiceService.get_next_invoice_number(db, user)

        invoice = Invoice(
            client_id=data.client_id,
            user_id=user.id,
            invoice_number=invoice_number,
            issue_date=data.issue_date,
            due_date=data.due_date,
            period_start=data.period_start,
            period_end=data.period_end,
            tax_rate=data.tax_rate,
            discount=data.discount,
            notes=data.notes,
            status=InvoiceStatus.DRAFT,
        )
        db.add(invoice)
        await db.flush()  # Get ID

        # Link sessions
        if data.session_ids:
            sessions_result = await db.execute(
                select(Session).where(
                    Session.id.in_(data.session_ids),
                    Session.client_id == data.client_id
                )
            )
            sessions = sessions_result.scalars().all()
            for session in sessions:
                session.invoice_id = invoice.id
                line_item = InvoiceLineItem(
                    invoice_id=invoice.id,
                    description=f"Massage Therapy - {session.date.strftime('%B %d, %Y')} ({session.duration_minutes} min)",
                    quantity=1.0,
                    unit_price=session.rate,
                    tax_rate=data.tax_rate,
                    total=session.rate * (1 + data.tax_rate) - session.discount,
                    sort_order=len(invoice.line_items)
                )
                db.add(line_item)

        # Add custom line items
        if data.line_items:
            for i, item in enumerate(data.line_items):
                line_item = InvoiceLineItem(
                    invoice_id=invoice.id,
                    description=item.description,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    tax_rate=item.tax_rate,
                    total=item.quantity * item.unit_price * (1 + item.tax_rate),
                    sort_order=i
                )
                db.add(line_item)

        await db.flush()
        await InvoiceService.recalculate_totals(db, invoice)
        await db.refresh(invoice)
        return invoice

    @staticmethod
    async def recalculate_totals(db: AsyncSession, invoice: Invoice):
        """Recalculate invoice totals from line items"""
        items_result = await db.execute(
            select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id)
        )
        items = items_result.scalars().all()

        subtotal = sum(item.quantity * item.unit_price for item in items)
        tax_amount = sum(item.quantity * item.unit_price * item.tax_rate for item in items)
        total = subtotal + tax_amount - invoice.discount

        payments_result = await db.execute(
            select(Payment).where(Payment.invoice_id == invoice.id)
        )
        payments = payments_result.scalars().all()
        amount_paid = sum(p.amount for p in payments)

        await db.execute(
            update(Invoice).where(Invoice.id == invoice.id).values(
                subtotal=subtotal,
                tax_amount=tax_amount,
                total=total,
                amount_paid=amount_paid,
                balance_due=max(0, total - amount_paid)
            )
        )

    @staticmethod
    async def record_payment(
        db: AsyncSession,
        invoice: Invoice,
        payment_data: PaymentCreate
    ) -> Payment:
        payment = Payment(
            invoice_id=invoice.id,
            amount=payment_data.amount,
            payment_date=payment_data.payment_date,
            payment_method=payment_data.payment_method,
            reference=payment_data.reference,
            notes=payment_data.notes,
        )
        db.add(payment)
        await db.flush()

        await InvoiceService.recalculate_totals(db, invoice)
        await db.refresh(invoice)

        # Update status
        if invoice.balance_due <= 0:
            invoice.status = InvoiceStatus.PAID
            invoice.paid_date = payment_data.payment_date
            invoice.payment_method = payment_data.payment_method

        return payment

    @staticmethod
    async def check_overdue_invoices(db: AsyncSession):
        """Mark overdue invoices - called by scheduler"""
        today = date.today()
        await db.execute(
            update(Invoice).where(
                Invoice.due_date < today,
                Invoice.status == InvoiceStatus.SENT,
                Invoice.balance_due > 0
            ).values(status=InvoiceStatus.OVERDUE)
        )
        await db.commit()


class PDFService:
    """Generate invoice PDFs using WeasyPrint"""

    TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1a1a2e; font-size: 13px; background: white; }
  .page { padding: 48px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; border-bottom: 3px solid #0066cc; padding-bottom: 24px; }
  .logo-area h1 { font-size: 28px; font-weight: 700; color: #0066cc; }
  .logo-area p { color: #666; font-size: 12px; margin-top: 4px; }
  .invoice-title { text-align: right; }
  .invoice-title h2 { font-size: 36px; font-weight: 700; color: #0066cc; letter-spacing: 2px; }
  .invoice-title .number { font-size: 18px; color: #333; margin-top: 8px; }
  .status-badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 8px; }
  .status-paid { background: #d4edda; color: #155724; }
  .status-sent { background: #cce5ff; color: #004085; }
  .status-overdue { background: #f8d7da; color: #721c24; }
  .status-draft { background: #e2e3e5; color: #383d41; }
  .parties { display: flex; gap: 40px; margin-bottom: 36px; }
  .party { flex: 1; }
  .party h3 { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #0066cc; margin-bottom: 10px; }
  .party p { font-size: 13px; line-height: 1.7; color: #333; }
  .party .name { font-weight: 600; font-size: 15px; color: #1a1a2e; }
  .dates { display: flex; gap: 30px; margin-bottom: 36px; background: #f8f9fe; padding: 16px 20px; border-radius: 8px; border-left: 4px solid #0066cc; }
  .date-item label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; display: block; margin-bottom: 4px; }
  .date-item span { font-weight: 600; color: #1a1a2e; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #0066cc; color: white; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  thead th:last-child { text-align: right; }
  tbody tr { border-bottom: 1px solid #eef0f8; }
  tbody tr:nth-child(even) { background: #f8f9fe; }
  tbody td { padding: 12px 16px; color: #333; }
  tbody td:last-child { text-align: right; font-weight: 500; }
  .totals { margin-left: auto; width: 280px; }
  .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
  .totals-row.total { font-size: 17px; font-weight: 700; color: #0066cc; border-top: 2px solid #0066cc; border-bottom: none; padding-top: 12px; margin-top: 4px; }
  .totals-row.balance { font-size: 15px; font-weight: 600; color: {{ '#155724' if balance_due <= 0 else '#721c24' }}; }
  .notes { margin-top: 36px; padding: 16px; background: #f8f9fe; border-radius: 8px; }
  .notes h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 8px; }
  .notes p { color: #333; line-height: 1.6; }
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 11px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-area">
      <h1>{{ therapist_name }}</h1>
      <p>Registered Massage Therapist</p>
      {% if registration_number %}<p>Reg# {{ registration_number }}</p>{% endif %}
      <p>{{ therapist_address }}</p>
      {% if therapist_phone %}<p>{{ therapist_phone }}</p>{% endif %}
      {% if therapist_email %}<p>{{ therapist_email }}</p>{% endif %}
      {% if tax_number %}<p>HST#: {{ tax_number }}</p>{% endif %}
    </div>
    <div class="invoice-title">
      <h2>INVOICE</h2>
      <div class="number">{{ invoice_number }}</div>
      <span class="status-badge status-{{ status }}">{{ status }}</span>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Bill To</h3>
      <p class="name">{{ client_name }}</p>
      {% if client_address %}<p>{{ client_address }}</p>{% endif %}
      {% if client_email %}<p>{{ client_email }}</p>{% endif %}
      {% if client_phone %}<p>{{ client_phone }}</p>{% endif %}
      {% if insurance_provider %}
      <p style="margin-top:8px;font-size:11px;color:#666;">Insurance: {{ insurance_provider }}</p>
      {% if insurance_policy %}<p style="font-size:11px;color:#666;">Policy: {{ insurance_policy }}</p>{% endif %}
      {% endif %}
    </div>
  </div>

  <div class="dates">
    <div class="date-item">
      <label>Issue Date</label>
      <span>{{ issue_date }}</span>
    </div>
    <div class="date-item">
      <label>Due Date</label>
      <span>{{ due_date }}</span>
    </div>
    {% if period_start %}
    <div class="date-item">
      <label>Service Period</label>
      <span>{{ period_start }} — {{ period_end }}</span>
    </div>
    {% endif %}
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:center;">Tax</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      {% for item in line_items %}
      <tr>
        <td>{{ item.description }}</td>
        <td style="text-align:center;">{{ item.quantity }}</td>
        <td style="text-align:right;">${{ "%.2f"|format(item.unit_price) }}</td>
        <td style="text-align:center;">{{ (item.tax_rate * 100)|int }}%</td>
        <td>${{ "%.2f"|format(item.total) }}</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>${{ "%.2f"|format(subtotal) }}</span>
    </div>
    {% if discount > 0 %}
    <div class="totals-row">
      <span>Discount</span>
      <span>-${{ "%.2f"|format(discount) }}</span>
    </div>
    {% endif %}
    <div class="totals-row">
      <span>HST ({{ (tax_rate * 100)|int }}%)</span>
      <span>${{ "%.2f"|format(tax_amount) }}</span>
    </div>
    <div class="totals-row total">
      <span>Total (CAD)</span>
      <span>${{ "%.2f"|format(total) }}</span>
    </div>
    {% if amount_paid > 0 %}
    <div class="totals-row">
      <span>Paid</span>
      <span>-${{ "%.2f"|format(amount_paid) }}</span>
    </div>
    {% endif %}
    <div class="totals-row balance">
      <span>Balance Due</span>
      <span>${{ "%.2f"|format(balance_due) }}</span>
    </div>
  </div>

  {% if notes %}
  <div class="notes">
    <h4>Notes</h4>
    <p>{{ notes }}</p>
  </div>
  {% endif %}

  <div class="footer">
    <p>Thank you for choosing {{ therapist_name }} for your massage therapy needs.</p>
    <p style="margin-top:4px;">Please make cheques payable to {{ therapist_name }} or e-transfer to {{ therapist_email }}</p>
  </div>
</div>
</body>
</html>
"""

    @classmethod
    async def generate_pdf(cls, invoice: Invoice, user: User, client: Client) -> str:
        """Generate PDF and return file path"""
        try:
            from weasyprint import HTML
            from jinja2 import Template
        except ImportError:
            raise RuntimeError("WeasyPrint not installed")

        # Prepare template context
        context = {
            "therapist_name": user.full_name,
            "registration_number": user.registration_number,
            "therapist_address": f"{user.city}, {user.province}" if user.city else "",
            "therapist_phone": user.phone,
            "therapist_email": user.email,
            "tax_number": user.tax_number,
            "invoice_number": invoice.invoice_number,
            "status": invoice.status.value,
            "client_name": f"{client.first_name} {client.last_name}",
            "client_address": client.address,
            "client_email": client.email,
            "client_phone": client.phone,
            "insurance_provider": client.insurance_provider,
            "insurance_policy": client.insurance_policy_number,
            "issue_date": invoice.issue_date.strftime("%B %d, %Y"),
            "due_date": invoice.due_date.strftime("%B %d, %Y"),
            "period_start": invoice.period_start.strftime("%B %d, %Y") if invoice.period_start else None,
            "period_end": invoice.period_end.strftime("%B %d, %Y") if invoice.period_end else None,
            "line_items": invoice.line_items,
            "subtotal": invoice.subtotal,
            "discount": invoice.discount,
            "tax_rate": invoice.tax_rate,
            "tax_amount": invoice.tax_amount,
            "total": invoice.total,
            "amount_paid": invoice.amount_paid,
            "balance_due": invoice.balance_due,
            "notes": invoice.notes,
        }

        template = Template(cls.TEMPLATE)
        html_content = template.render(**context)

        # Save PDF
        pdf_dir = Path(settings.INVOICE_PDF_PATH)
        pdf_dir.mkdir(parents=True, exist_ok=True)
        filename = f"{invoice.invoice_number}.pdf"
        pdf_path = pdf_dir / filename

        HTML(string=html_content).write_pdf(str(pdf_path))

        return f"/storage/invoices/{filename}"


class EmailService:
    """Send invoice emails via SMTP"""

    @staticmethod
    async def send_invoice(
        invoice: Invoice,
        client: Client,
        user: User,
        pdf_path: str
    ) -> bool:
        try:
            import aiosmtplib
            from email.message import EmailMessage
            import aiofiles

            if not settings.SMTP_USER or not client.email:
                return False

            msg = EmailMessage()
            msg["From"] = f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>"
            msg["To"] = client.email
            msg["Subject"] = f"Invoice {invoice.invoice_number} from {user.full_name}"

            body = f"""Dear {client.first_name},

Please find attached your invoice {invoice.invoice_number} for massage therapy services.

Invoice Summary:
- Invoice #: {invoice.invoice_number}
- Issue Date: {invoice.issue_date.strftime('%B %d, %Y')}
- Due Date: {invoice.due_date.strftime('%B %d, %Y')}
- Amount Due: ${invoice.balance_due:.2f} CAD

Payment methods accepted:
- E-Transfer to {user.email}
- Cheque payable to {user.full_name}
- Cash

If you have any questions regarding this invoice, please don't hesitate to contact me.

Thank you for your continued trust in my services.

Warm regards,
{user.full_name}
Registered Massage Therapist
{user.phone or ''}
"""
            msg.set_content(body)

            # Attach PDF
            full_path = Path(".") / pdf_path.lstrip("/")
            if full_path.exists():
                async with aiofiles.open(full_path, "rb") as f:
                    pdf_data = await f.read()
                msg.add_attachment(
                    pdf_data,
                    maintype="application",
                    subtype="pdf",
                    filename=f"{invoice.invoice_number}.pdf"
                )

            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=True,
            )
            return True
        except Exception as e:
            print(f"Email error: {e}")
            return False
