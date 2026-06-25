FROM python:3.12-slim

# Never buffer Python output so Render's log stream is live.
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Copy only the package descriptor first so pip layer caches between code changes.
COPY pyproject.toml ./
COPY app ./app

RUN pip install --no-cache-dir -e .

EXPOSE 8000

# $PORT injected by Render/Fly at runtime; defaults to 8000 if absent.
CMD ["python", "-m", "app.main"]
