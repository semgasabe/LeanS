# DeployRocks / kazi.rocks — чеклист

## Два приложения — два URL

| URL | Dokku app | Назначение |
|-----|-----------|------------|
| https://semgasabe-leanstock.kazi.rocks | `semgasabe-leanstock-api` | Backend API |
| https://semgasabe-leanstock-frontend.kazi.rocks | `semgasabe-leanstock-frontend` | React UI |

Проверка API: `/health` на **API-домене**, не на frontend.

## 502 Bad Gateway = контейнер не отвечает

Cloudflare работает, но **приложение на сервере не запустилось** или слушает другой порт.

### Частая причина на DeployRocks

В логах frontend-деплоя оба домена вешаются на один nginx — это нормально для платформы.
Frontend теперь проксирует `/api/` и `/health` на `semgasabe-leanstock-api:3000`.

Если 502 остаётся — подождите 2–3 мин после деплоя (миграции Prisma) и обновите страницу **Ctrl+Shift+R**.

### 1. Переменные окружения на DeployRocks (обязательно)

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | PostgreSQL URL из панели DeployRocks |
| `REDIS_URL` | Redis URL из панели |
| `JWT_SECRET_KEY` | минимум 32 символа |
| `JWT_REFRESH_SECRET_KEY` | минимум 32 символа |
| `PORT` | `3000` (если платформа не задаёт сама) |
| `NODE_ENV` | `production` |
| `TENANT_ID` | `1` |
| `CORS_ORIGINS` | `https://semgasabe-leanstock-frontend.kazi.rocks,https://semgasabe-leanstock.kazi.rocks` |

### 2. После push — смотреть логи деплоя

Ищите строки:
- `[Startup] PORT=3000` — сервер стартовал
- `[LeanStock] Server running on port` — OK
- `[STARTUP ERROR]` или `Database setup failed` — причина 502

### 3. Проверка URL

- https://semgasabe-leanstock.kazi.rocks/health
- https://semgasabe-leanstock.kazi.rocks/ (тоже должен отвечать)

### 4. Порт

Приложение слушает `process.env.PORT` (по умолчанию **3000**).
В настройках сервиса DeployRocks укажите **container port 3000**.

### 5. Передеплой

```bash
git add .
git commit -m "Harden production startup for DeployRocks"
git push origin master
```

Дождитесь зелёного деплоя в панели (2–5 минут).
