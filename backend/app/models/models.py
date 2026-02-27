"""
Database Models for RMT Billing System
"""
import enum
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text,
    Enum, Date, ForeignKey, JSON, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from app.db.base import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class BillingFrequency(str, enum.Enum):
    PER_SESSION = "per_session"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"

class SessionStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class ExpenseCategory(str, enum.Enum):
    SUPPLIES = "supplies"
    EQUIPMENT = "equipment"
    RENT = "rent"
    INSURANCE = "insurance"
    EDUCATION = "education"
    MARKETING = "marketing"
    SOFTWARE = "software"
    UTILITIES = "utilities"
    OTHER = "other"

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    CHEQUE = "cheque"
    E_TRANSFER = "e_transfer"
    CREDIT_CARD = "credit_card"
    INSURANCE = "insurance"
    OTHER = "other"


# ─── User / Therapist ─────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Therapist profile
    registration_number = Column(String(50), nullable=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    province = Column(String(50), nullable=True)
    postal_code = Column(String(10), nullable=True)
    logo_url = Column(String(500), nullable=True)
    signature_url = Column(String(500), nullable=True)
    tax_number = Column(String(50), nullable=True)

    # Settings
    default_session_rate = Column(Float, default=100.0)
    default_session_duration = Column(Integer, default=60)  # minutes
    tax_rate = Column(Float, default=0.13)
    invoice_prefix = Column(String(10), default="INV")
    invoice_counter = Column(Integer, default=1000)

    # Relationships
    clinics = relationship("Clinic", back_populates="owner", cascade="all, delete-orphan")
    clients = relationship("Client", back_populates="therapist", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")


# ─── Clinic ───────────────────────────────────────────────────────────────────

class Clinic(Base):
    __tablename__ = "clinics"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    province = Column(String(50), nullable=True)
    postal_code = Column(String(10), nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    contact_person = Column(String(255), nullable=True)
    commission_rate = Column(Float, default=0.0)  # % therapist pays to clinic
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    owner = relationship("User", back_populates="clinics")
    sessions = relationship("Session", back_populates="clinic")


# ─── Client ───────────────────────────────────────────────────────────────────

class Client(Base):
    __tablename__ = "clients"

    therapist_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    province = Column(String(50), nullable=True)
    postal_code = Column(String(10), nullable=True)

    # Billing
    billing_frequency = Column(Enum(BillingFrequency), default=BillingFrequency.PER_SESSION)
    default_rate = Column(Float, nullable=True)  # Override therapist default
    insurance_provider = Column(String(255), nullable=True)
    insurance_policy_number = Column(String(100), nullable=True)
    insurance_member_id = Column(String(100), nullable=True)

    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    therapist = relationship("User", back_populates="clients")
    sessions = relationship("Session", back_populates="client")
    invoices = relationship("Invoice", back_populates="client")

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


# ─── Session ──────────────────────────────────────────────────────────────────

class Session(Base):
    __tablename__ = "sessions"

    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    clinic_id = Column(Integer, ForeignKey("clinics.id", ondelete="SET NULL"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)

    date = Column(Date, nullable=False, index=True)
    start_time = Column(String(10), nullable=True)  # "HH:MM"
    duration_minutes = Column(Integer, default=60)
    status = Column(Enum(SessionStatus), default=SessionStatus.COMPLETED)

    rate = Column(Float, nullable=False)
    taxes = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, nullable=False)

    treatment_type = Column(String(255), nullable=True)
    soap_notes = Column(Text, nullable=True)  # Subjective, Objective, Assessment, Plan
    is_billable = Column(Boolean, default=True)

    # Relationships
    client = relationship("Client", back_populates="sessions")
    clinic = relationship("Clinic", back_populates="sessions")
    invoice = relationship("Invoice", back_populates="sessions")

    __table_args__ = (
        Index("ix_sessions_date_client", "date", "client_id"),
    )


# ─── Invoice ──────────────────────────────────────────────────────────────────

class Invoice(Base):
    __tablename__ = "invoices"

    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    invoice_number = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, index=True)

    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    period_start = Column(Date, nullable=True)
    period_end = Column(Date, nullable=True)

    subtotal = Column(Float, default=0.0)
    tax_rate = Column(Float, default=0.13)
    tax_amount = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    amount_paid = Column(Float, default=0.0)
    balance_due = Column(Float, default=0.0)

    notes = Column(Text, nullable=True)
    pdf_url = Column(String(500), nullable=True)

    # Payment info
    paid_date = Column(Date, nullable=True)
    payment_method = Column(Enum(PaymentMethod), nullable=True)
    payment_reference = Column(String(255), nullable=True)

    # Email tracking
    sent_at = Column(String(50), nullable=True)
    email_sent_to = Column(String(255), nullable=True)
    reminder_sent_at = Column(String(50), nullable=True)

    # Relationships
    client = relationship("Client", back_populates="invoices")
    user = relationship("User")
    sessions = relationship("Session", back_populates="invoice")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="invoice", cascade="all, delete-orphan")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    description = Column(String(500), nullable=False)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, nullable=False)
    tax_rate = Column(Float, default=0.0)
    total = Column(Float, nullable=False)
    sort_order = Column(Integer, default=0)

    invoice = relationship("Invoice", back_populates="line_items")


# ─── Payment ──────────────────────────────────────────────────────────────────

class Payment(Base):
    __tablename__ = "payments"

    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_date = Column(Date, nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    reference = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)

    invoice = relationship("Invoice", back_populates="payments")


# ─── Expense ──────────────────────────────────────────────────────────────────

class Expense(Base):
    __tablename__ = "expenses"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(Enum(ExpenseCategory), nullable=False)
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False)
    tax_amount = Column(Float, default=0.0)
    date = Column(Date, nullable=False, index=True)
    vendor = Column(String(255), nullable=True)
    receipt_url = Column(String(500), nullable=True)
    is_tax_deductible = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="expenses")
