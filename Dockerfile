FROM node:20-alpine AS frontend
WORKDIR /app/coach_front
RUN mkdir -p /app/static
COPY coach_front/package.json coach_front/pnpm-lock.yaml coach_front/pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@9.12.3 --activate
RUN pnpm install --frozen-lockfile
COPY coach_front/ ./
RUN pnpm run build

FROM python:3.12-slim AS backend
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
  && rm -rf /var/lib/apt/lists/*
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . ./
COPY --from=frontend /app/static/dist /app/static/dist
EXPOSE 8000
CMD ["python", "web_app.py", "--host", "0.0.0.0", "--port", "8000"]
