from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "rmt_billing",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Toronto",
    enable_utc=True,
    beat_schedule={
        # Run every day at 1am to mark overdue invoices
        "check-overdue-invoices": {
            "task": "app.tasks.check_overdue_invoices",
            "schedule": crontab(hour=1, minute=0),
        },
    },
)
