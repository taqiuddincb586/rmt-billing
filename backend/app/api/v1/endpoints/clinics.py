"""Clinics endpoint"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.models import User, Clinic
from app.schemas.schemas import ClinicCreate, ClinicUpdate, ClinicResponse
from app.core.security import get_current_user

router = APIRouter()


@router.get("", response_model=list[ClinicResponse])
async def list_clinics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Clinic).where(Clinic.user_id == current_user.id, Clinic.is_active == True)
    )
    return result.scalars().all()


@router.post("", response_model=ClinicResponse, status_code=201)
async def create_clinic(
    data: ClinicCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clinic = Clinic(**data.model_dump(), user_id=current_user.id)
    db.add(clinic)
    await db.commit()
    await db.refresh(clinic)
    return clinic


@router.get("/{clinic_id}", response_model=ClinicResponse)
async def get_clinic(
    clinic_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Clinic).where(Clinic.id == clinic_id, Clinic.user_id == current_user.id)
    )
    clinic = result.scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    return clinic


@router.put("/{clinic_id}", response_model=ClinicResponse)
async def update_clinic(
    clinic_id: int,
    data: ClinicUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Clinic).where(Clinic.id == clinic_id, Clinic.user_id == current_user.id)
    )
    clinic = result.scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(clinic, key, value)
    await db.commit()
    await db.refresh(clinic)
    return clinic


@router.delete("/{clinic_id}", status_code=204)
async def delete_clinic(
    clinic_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Clinic).where(Clinic.id == clinic_id, Clinic.user_id == current_user.id)
    )
    clinic = result.scalar_one_or_none()
    if not clinic:
        raise HTTPException(status_code=404, detail="Clinic not found")
    clinic.is_active = False
    await db.commit()
