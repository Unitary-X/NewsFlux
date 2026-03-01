from celery import Celery
import os
from dotenv import load_dotenv

load_dotenv()

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "newsflux_worker",
    broker=redis_url,
    backend=redis_url,
    include=['app.services.billing_job', 'app.services.backup_scheduler']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    beat_schedule={
        'daily-gdrive-backup': {
            'task': 'backup.daily',
            'schedule': 86400.0,  # Every 24 hours (configure exact time via crontab in production)
        },
        'monthly-gdrive-backup': {
            'task': 'backup.monthly',
            'schedule': 2592000.0,  # ~30 days (use crontab(day_of_month=1) in production)
        },
    },
)
