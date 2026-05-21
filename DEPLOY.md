# DeployRocks — исправление деплоя LeanS

## Главная ошибка (из вашего лога)

```text
Network semgasabe-leans-net does not exist
No web listeners specified for semgasabe-leans-api / semgasabe-leans-frontend
```

**Сборка Docker проходит.** Падает **запуск контейнера** — сеть не создана и Dokku не знает порты 3000 / 80.

---

## Что видно в логе DeployRocks

| Строка | Значение |
|--------|----------|
| `SEMGASABE_LEANS_API_URL: http://semgasabe-leans-api.web:5000` | **Неверно** — API слушает **3000**, не 5000 |
| `Rewriting nginx upstream: api: → semgasabe-leans-api.web:` | В `nginx.conf` upstream должен быть **`api:3000`** |
| `Domain: semgasabe-leans.kazi.rocks` | Публичный URL frontend |
| `DEPLOYED_NETWORK=semgasabe-leans-net` | Сеть **заявлена**, но **не создана** до деплоя |

---

## Решение A — в панели DeployRocks (без SSH)

### 1. Создать сеть / передеплой стека

1. Удалите failed apps: `semgasabe-leans-api`, `semgasabe-leans-frontend` (или весь проект).
2. Запустите **полный Deploy проекта** (не только frontend).
3. Убедитесь, что в логе **до** `Deploying semgasabe-leans-api` есть шаг создания сети `semgasabe-leans-net`.
4. Если есть опция **Create network** — включите.

### 2. Порты (обязательно)

| App | Container port | Публичный |
|-----|----------------|-----------|
| `semgasabe-leans-api` | **3000** | 80/443 → 3000 |
| `semgasabe-leans-frontend` | **80** | 80/443 → 80 |

В настройках каждого приложения: **Web Port / Proxy Port** = значения из таблицы.

### 3. Переменные окружения

**API (`semgasabe-leans-api`):**

```env
PORT=3000
NODE_ENV=production
DATABASE_URL=<from semgasabe-leans-db>
REDIS_URL=<from semgasabe-leans-redis>
JWT_SECRET_KEY=<32+ chars>
JWT_REFRESH_SECRET_KEY=<32+ chars>
FRONTEND_URL=https://semgasabe-leans.kazi.rocks
CORS_ORIGINS=https://semgasabe-leans.kazi.rocks,https://semgasabe-leans-api.kazi.rocks
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASS=...
SEED_DEV_ADMIN=false
```

**Frontend (`semgasabe-leans-frontend`):**

```env
# НЕ используйте порт 5000:
SEMGASABE_LEANS_API_URL=http://semgasabe-leans-api.web:3000
```

Или удалите `SEMGASABE_LEANS_API_URL` — nginx проксирует `/api/` сам.

### 4. Пути в Git

| App | Root directory |
|-----|----------------|
| API | `leanstock` |
| Frontend | `leanstock/front/leanstock-frontend` |

### 5. Push и redeploy

```powershell
cd leanstock
git add front/leanstock-frontend/nginx.conf front/leanstock-frontend/Dockerfile front/leanstock-frontend/app.json app.json scripts/dokku-post-deploy.sh DEPLOY.md
git commit -m "fix: DeployRocks nginx api:3000 upstream and deploy docs"
git push origin main
```

---

## Решение B — SSH на сервер (если есть доступ)

```bash
chmod +x scripts/dokku-post-deploy.sh
sudo scripts/dokku-post-deploy.sh
```

Скрипт создаёт сеть, выставляет `dokku ports:set` и перезапускает apps.

---

## Проверка после успеха

```text
https://semgasabe-leans-api.kazi.rocks/health
https://semgasabe-leans.kazi.rocks/
```

(Точные домены смотрите в панели **dokku urls**.)

```bash
dokku logs semgasabe-leans-api --tail 50
dokku logs semgasabe-leans-frontend --tail 20
```

В логах API должно быть: `[LeanStock] Server running on port 3000`.

---

## SSL (.crt / .key)

Сообщения про `semgasabe-leans-api.crt` — **нормально** (self-signed). Это не причина падения деплоя.

---

## Если снова Failed

Напишите в поддержку DeployRocks / преподавателю:

> Deploy creates `semgasabe-leans-db` and redis, sets `DEPLOYED_NETWORK=semgasabe-leans-net`, but **does not create** the network before `scheduler-deploy-process-container`. Please fix network creation order or run `docker network create semgasabe-leans-net` before web deploy.
