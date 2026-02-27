"""
Pydantic Schemas for Request/Response validation
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, validator

from app.models.models import (
    InvoiceStatus, BillingFrequency, SessionStatus,
    ExpenseCategory, PaymentMethod
)


# ─── Common ───────────────────────────────────────────────────────────────────

class PaginationMeta(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedResponse(BaseModel):
    data: list
    meta: PaginationMeta


# ─── Auth ─────────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: int
    exp: int

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)


# ─── User ─────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    registration_number: Optional[str] = None
    tax_number: Optional[str] = None
    default_session_rate: float = 100.0
    default_session_duration: int = 60
    tax_rate: float = 0.13
    invoice_prefix: str = "INV"

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    invoice_counter: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Clinic ───────────────────────────────────────────────────────────────────

class ClinicBase(BaseModel):
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    contact_person: Optional[str] = None
    commission_rate: float = 0.0
    notes: Optional[str] = None

class ClinicCreate(ClinicBase):
    pass

class ClinicUpdate(ClinicBase):
    name: Optional[str] = None

class ClinicResponse(ClinicBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Client ───────────────────────────────────────────────────────────────────

class ClientBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    billing_frequency: BillingFrequency = BillingFrequency.PER_SESSION
    default_rate: Optional[float] = None
    insurance_provider: Optional[str] = None
    insurance_policy_number: Optional[str] = None
    insurance_member_id: Optional[str] = None
    notes: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(ClientBase):
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class ClientResponse(ClientBase):
    id: int
    therapist_id: int
    is_active: bool
    created_at: datetime
    full_name: str

    class Config:
        from_attributes = True

class ClientSummary(BaseModel):
    id: int
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    billing_frequency: BillingFrequency
    is_active: bool
    session_count: Optional[int] = 0
    outstanding_balance: Optional[float] = 0.0

    class Config:
        from_attributes = True


# ─── Session ──────────────────────────────────────────────────────────────────

class SessionBase(BaseModel):
    client_id: int
    clinic_id: Optional[int] = None
    date: date
    start_time: Optional[str] = None
    duration_minutes: int = 60
    status: SessionStatus = SessionStatus.COMPLETED
    rate: float
    taxes: float = 0.0
    discount: float = 0.0
    treatment_type: Optional[str] = None
    soap_notes: Optional[str] = None
    is_billable: bool = True

class SessionCreate(SessionBase):
    pass

class SessionUpdate(SessionBase):
    client_id: Optional[int] = None
    date: Optional[date] = None
    rate: Optional[float] = None

class SessionResponse(SessionBase):
    id: int
    invoice_id: Optional[int]
    total: float
    created_at: datetime
    client: Optional[ClientSummary] = None
    clinic_name: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Invoice ──────────────────────────────────────────────────────────────────

class InvoiceLineItemBase(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float
    tax_rate: float = 0.0

class InvoiceLineItemCreate(InvoiceLineItemBase):
    pass

class InvoiceLineItemResponse(InvoiceLineItemBase):
    id: int
    total: float
    sort_order: int

    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    client_id: int
    issue_date: date
    due_date: date
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    tax_rate: float = 0.13
    discount: float = 0.0
    notes: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    session_ids: Optional[List[int]] = []
    line_items: Optional[List[InvoiceLineItemCreate]] = []

class InvoiceUpdate(BaseModel):
    status: Optional[InvoiceStatus] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    discount: Optional[float] = None

class InvoiceResponse(InvoiceBase):
    id: int
    user_id: int
    invoice_number: str
    status: InvoiceStatus
    subtotal: float
    tax_amount: float
    total: float
    amount_paid: float
    balance_due: float
    pdf_url: Optional[str]
    sent_at: Optional[str]
    paid_date: Optional[date]
    payment_method: Optional[PaymentMethod]
    created_at: datetime
    client: Optional[ClientSummary] = None
    line_items: List[InvoiceLineItemResponse] = []

    class Config:
        from_attributes = True

class InvoiceSummary(BaseModel):
    id: int
    invoice_number: str
    client_name: str
    status: InvoiceStatus
    issue_date: date
    due_date: date
    total: float
    balance_due: float
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Payment ──────────────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    amount: float
    payment_date: date
    payment_method: PaymentMethod
    reference: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(PaymentCreate):
    id: int
    invoice_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Expense ──────────────────────────────────────────────────────────────────

class ExpenseBase(BaseModel):
    category: ExpenseCategory
    description: str
    amount: float
    tax_amount: float = 0.0
    date: date
    vendor: Optional[str] = None
    is_tax_deductible: bool = True
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(ExpenseBase):
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    date: Optional[date] = None

class ExpenseResponse(ExpenseBase):
    id: int
    user_id: int
    receipt_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Dashboard / Analytics ────────────────────────────────────────────────────

class DashboardStats(BaseModel):
    total_revenue: float
    total_expenses: float
    net_income: float
    outstanding_balance: float
    sessions_this_month: int
    invoices_unpaid: int
    invoices_overdue: int
    new_clients_this_month: int
    revenue_by_month: List[dict]
    top_clients: List[dict]
    expense_by_category: List[dict]
    invoice_status_breakdown: dict
