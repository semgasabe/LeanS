# DeployRocks — переменные и порты (semgasabe-leans-*)

## Dokku ports (обязательно в панели)

| App | Container port | Назначение |
|-----|----------------|------------|
| `semgasabe-leans-api` | **3000** | Express `PORT` / `EXPOSE 3000` |
| `semgasabe-leans-frontend` | **80** | nginx `listen 80` |

Не используйте **5000** — в логе была ошибка `semgasabe-leans-api.web:5000`.

---

## semgasabe-leans-api — переменные в панели

| Переменная | Значение для production |
|------------|-------------------------|
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | из linked `semgasabe-leans-db` |
| `REDIS_URL` | из linked `semgasabe-leans-redis` |
| `JWT_SECRET_KEY` | ≥ 32 символов (уникальные) |
| `JWT_REFRESH_SECRET_KEY` | ≥ 32 символов |
| `TENANT_ID` | `1` |
| `FRONTEND_URL` | `https://semgasabe-leans.kazi.rocks` |
| `CORS_ORIGINS` | `https://semgasabe-leans.kazi.rocks,https://semgasabe-leans-api.kazi.rocks` (обязательно после redeploy API с `trust proxy`) |
| `EMAIL_HOST` | `smtp.gmail.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_USER` | ваш Gmail |
| `EMAIL_PASS` | app password |
| `EMAIL_FROM_ADDRESS` | `noreply@leanstock.com` |
| `SEED_DEV_ADMIN` | `false` |

Локальный `.env` с `localhost` **не подхватывается** на сервер автоматически — всё задаётся в DeployRocks.

---

## semgasabe-leans-frontend

| Переменная | Рекомендация |
|------------|--------------|
| `SEMGASABE_LEANS_API_URL` | **удалить** или не задавать |
| Build-arg `VITE_API_URL` | `https://semgasabe-leans-api.kazi.rocks/api/v1` (в Dockerfile по умолчанию) |

Frontend **не проксирует** `/api` через nginx (иначе падение при старте).

---

## Порядок деплоя

1. `semgasabe-leans-db` + `semgasabe-leans-redis`
2. Сеть `semgasabe-leans-net`
3. **`semgasabe-leans-api`** (сначала)
4. **`semgasabe-leans-frontend`** (после API)

---

## Проверка

- https://semgasabe-leans-api.kazi.rocks/health — должно быть `"database":"ok","schema":"ok"`
- Если `"schema":"missing"` — redeploy API (entrypoint создаст таблицы через `db push`)
- https://semgasabe-leans.kazi.rocks/

## Login/register 500 при health ok

Частая причина: миграция помечена «applied», таблицы `User` не созданы. Исправлено в `entrypoint.sh` (убран `migrate resolve --applied`).
