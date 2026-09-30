"""Reminder endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Reminder, User
from app.schemas.reminder import ReminderCreate, ReminderOut

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderOut])
def list_reminders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ReminderOut]:
    rows = (
        db.query(Reminder)
        .filter(Reminder.user_id == user.id)
        .order_by(Reminder.date.asc())
        .all()
    )
    return [ReminderOut.model_validate(r) for r in rows]


@router.post("", response_model=ReminderOut, status_code=201)
def create_reminder(
    payload: ReminderCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ReminderOut:
    reminder = Reminder(
        user_id=user.id,
        title=payload.title,
        date=payload.date,
        document_id=payload.document_id,
        related_clause=payload.related_clause,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return ReminderOut.model_validate(reminder)


@router.delete("/{reminder_id}", status_code=204, response_model=None)
def delete_reminder(
    reminder_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    reminder = db.get(Reminder, reminder_id)
    if reminder is None or reminder.user_id != user.id:
        raise HTTPException(status_code=404, detail="Reminder not found")
    db.delete(reminder)
    db.commit()
