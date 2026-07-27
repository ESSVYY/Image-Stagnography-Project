FROM python:3.12-slim

WORKDIR /app

COPY apps/api/requirements.txt /app/apps/api/requirements.txt
RUN python -m pip install --no-cache-dir --upgrade pip && python -m pip install --no-cache-dir -r /app/apps/api/requirements.txt

COPY apps/api /app/apps/api

EXPOSE 8000

CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
