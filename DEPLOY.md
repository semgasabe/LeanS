# DeployRocks (Dokku) — LeanS / LeanStock

## Ваши приложения (из лога)

| Сервис | Dokku app | Container port |
|--------|-----------|----------------|
| API | `semgasabe-leans-api` | **3000** |
| Frontend | `semgasabe-leans-frontend` | **80** (nginx) |
| PostgreSQL | `semgasabe-leans-db` | — |
| Redis | `semgasabe-leans-redis` | — |
| Docker network | `semgasabe-leans-net` | все приложения в одной сети |

Типичные URL (проверьте в панели DeployRocks):

- Frontend: `https://semgasabe-leans-frontend.kazi.rocks`
- API: `https://semgasabe-leans-api.kazi.rocks`

---

## Почему падает деплой (ваш лог)

### 1. `Network semgasabe-leans-net does not exist`

Сеть должна быть создана **до** запуска API и frontend. БД (`leans-db`, `leans-redis`) у вас поднялись, сеть — нет → контейнеры web не стартуют.

**Что сделать в панели DeployRocks:**

1. Удалите failed apps (или весь stack) и задеплойте проект **заново целиком** (не только frontend).
2. Убедитесь, что в логе setup есть создание сети **до** `Deploying semgasabe-leans-api`.
3. Если есть кнопка «Create network» / «Setup stack» — выполните её первой.

На сервере (если есть SSH, только по инструкции курса):

```bash
docker network create semgasabe-leans-net
dokku network:set semgasabe-leans-api attach-post-deploy semgasabe-leans-net
dokku network:set semgasabe-leans-frontend attach-post-deploy semgasabe-leans-net
```

### 2. `No web listeners specified for semgasabe-leans-frontend`

Образ собрался, но Dokku не знал, что проксировать **порт 80**.

**Исправление в репозитории:** файл `front/leanstock-frontend/app.json` с healthcheck на port **80** (уже добавлен).

**В панели DeployRocks для frontend:**

- **Web process / Container port:** `80`
- **Dockerfile path:** `front/leanstock-frontend/Dockerfile` (или корень frontend-приложения)
- Build-arg (опционально): `VITE_API_URL=https://semgasabe-leans-api.kazi.rocks/api/v1`

После push — **Redeploy frontend**, затем API.

### 3. SSL (`semgasabe-leans-frontend.crt` / `.key`)

Это нормально — платформа ставит self-signed сертификат. Не ошибка сборки.

---

## Переменные окружения — API (`semgasabe-leans-api`)

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | из `semgasabe-leans-db` |
| `REDIS_URL` | из `semgasabe-leans-redis` |
| `JWT_SECRET_KEY` | ≥ 32 символов |
| `JWT_REFRESH_SECRET_KEY` | ≥ 32 символов |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |
| `TENANT_ID` | `1` |
| `FRONTEND_URL` | `https://semgasabe-leans-frontend.kazi.rocks` |
| `CORS_ORIGINS` | `https://semgasabe-leans-frontend.kazi.rocks,https://semgasabe-leans-api.kazi.rocks` |
| `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` | SMTP (Gmail app password) |
| `SEED_DEV_ADMIN` | `false` в production |
| `SEED_ADMIN_EMAIL` | `sabina.serzhan@narxoz.kz` (только dev) |

---

## Пути в GitHub (монорепо LeanS)

Если репозиторий **LeanS** с папкой `leanstock/`:

| Компонент | Root directory в DeployRocks |
|-----------|------------------------------|
| API | `leanstock` (Dockerfile в корне leanstock) |
| Frontend | `leanstock/front/leanstock-frontend` |

---

## Проверка после успешного деплоя

```text
https://semgasabe-leans-api.kazi.rocks/health          → {"status":"ok"}
https://semgasabe-leans-frontend.kazi.rocks/           → React UI
https://semgasabe-leans-api.kazi.rocks/api-docs        → Swagger
```

Логи:

```bash
dokku logs semgasabe-leans-api --tail 100
dokku logs semgasabe-leans-frontend --tail 50
```

---

## Git push

```powershell
cd "c:\Users\sabis\OneDrive\Рабочий стол\LeanS\leanstock"
git add front/leanstock-frontend/app.json front/leanstock-frontend/Dockerfile front/leanstock-frontend/nginx.conf DEPLOY.md
git commit -m "fix: DeployRocks frontend port 80 healthcheck and Dokku network docs"
git push origin main
```

Затем в DeployRocks: **Redeploy всего проекта** (API + frontend + network).
