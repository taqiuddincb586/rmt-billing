from typing import Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import User, Session, Client, Clinic
from app.schemas.schemas import SessionCreate, SessionUpdate, SessionResponse
from app.core.security import get_current_user

router = APIRouter()


def calc_total(rate: float, taxes: float, discount: float) -> float:
    return round(rate * (1 + taxes) - discount, 2)


@router.get("/", response_model=list[SessionResponse])
async def list_sessions(
    client_id: Optional[int] = None,
    clinic_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    unbilled_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        select(Session)
        .join(Client, Session.client_id == Client.id)
        .where(Client.therapist_id == current_user.id)
        .options(selectinload(Session.client), selectinload(Session.clinic))
    )

    if client_id:
        query = query.where(Session.client_id == client_id)
    if clinic_id:
        query = query.where(Session.clinic_id == clinic_id)
    if start_date:
        query = query.where(Session.date >= start_date)
    if end_date:
        query = query.where(Session.date <= end_date)
    if unbilled_only:
        query = query.where(Session.invoice_id.is_(None), Session.is_billable == True)

    query = query.order_by(Session.date.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    sessions = result.scalars().all()

    responses = []
    for s in sessions:
        resp = SessionResponse(
            id=s.id, client_id=s.client_id, clinic_id=s.clinic_id,
            date=s.date, start_time=s.start_time, duration_minutes=s.duration_minutes,
            status=s.status, rate=s.rate, taxes=s.taxes, discount=s.discount,
            total=s.total, treatment_type=s.treatment_type, soap_notes=s.soap_notes,
            is_billable=s.is_billable, invoice_id=s.invoice_id, created_at=s.created_at,
            clinic_name=s.clinic.name if s.clinic else None,
        )
        responses.append(resp)
    return responses


@router.post("/", response_model=SessionResponse, status_code=201)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify client belongs to user
    client_result = await db.execute(
        select(Client).where(Client.id == data.client_id, Client.therapist_id == current_user.id)
    )
    if not client_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Client not found")

    total = calc_total(data.rate, data.taxes, data.discount)
    session = Session(**data.model_dump(), total=total)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Session)
        .join(Client, Session.client_id == Client.id)
        .where(Session.id == session_id, Client.therapist_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.put("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: int,
    data: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Session)
        .join(Client, Session.client_id == Client.id)
        .where(Session.id == session_id, Client.therapist_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(session, key, value)

    session.total = calc_total(session.rate, session.taxes, session.discount)
    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Session)
        .join(Client, Session.client_id == Client.id)
        .where(Session.id == session_id, Client.therapist_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
