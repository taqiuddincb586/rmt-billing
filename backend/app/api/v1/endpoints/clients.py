from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import User, Client, Invoice, Session, InvoiceStatus
from app.schemas.schemas import ClientCreate, ClientUpdate, ClientResponse, ClientSummary
from app.core.security import get_current_user

router = APIRouter()


@router.get("/", response_model=list[ClientSummary])
async def list_clients(
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Client).where(Client.therapist_id == current_user.id)
    if is_active is not None:
        query = query.where(Client.is_active == is_active)
    if search:
        query = query.where(
            (Client.first_name.ilike(f"%{search}%")) |
            (Client.last_name.ilike(f"%{search}%")) |
            (Client.email.ilike(f"%{search}%"))
        )
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    clients = result.scalars().all()

    # Build summaries with stats
    summaries = []
    for client in clients:
        # Session count
        session_count_result = await db.execute(
            select(func.count(Session.id)).where(Session.client_id == client.id)
        )
        session_count = session_count_result.scalar() or 0

        # Outstanding balance
        balance_result = await db.execute(
            select(func.coalesce(func.sum(Invoice.balance_due), 0)).where(
                and_(
                    Invoice.client_id == client.id,
                    Invoice.status.in_([InvoiceStatus.SENT, InvoiceStatus.OVERDUE])
                )
            )
        )
        outstanding = balance_result.scalar() or 0.0

        summaries.append(ClientSummary(
            id=client.id,
            full_name=f"{client.first_name} {client.last_name}",
            email=client.email,
            phone=client.phone,
            billing_frequency=client.billing_frequency,
            is_active=client.is_active,
            session_count=session_count,
            outstanding_balance=outstanding,
        ))

    return summaries


@router.post("/", response_model=ClientResponse, status_code=201)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    client = Client(**data.model_dump(), therapist_id=current_user.id)
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.therapist_id == current_user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.therapist_id == current_user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(client, key, value)
    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Client).where(Client.id == client_id, Client.therapist_id == current_user.id)
    )
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.is_active = False  # Soft delete
    await db.commit()
