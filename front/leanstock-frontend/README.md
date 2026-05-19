# LeanStock Frontend

Фронтенд для системы управления складом LeanStock.

## Стек

- **React 18** + **Vite**
- **React Router v6** — навигация
- **Axios** — HTTP-запросы с авто-рефрешем токенов
- **Recharts** — графики
- **Lucide React** — иконки

## Запуск

### 1. Убедись, что бэкенд работает

```bash
# В папке leanstock (бэкенд)
docker compose up --build
# или
npm start
```

Бэкенд должен быть доступен на `http://localhost:3000`

### 2. Установи зависимости и запусти фронтенд

```bash
npm install
npm run dev
```
(cd front 
cd leanstock-frontend
npm install
npm run dev)

Открой браузер: **http://localhost:5173**

---

## Страницы

| Страница | Доступ |
|---------|--------|
| `/` | Дашборд с графиками и статистикой |
| `/products` | Каталог товаров (CRUD) |
| `/inventory` | Инвентарь, движения, перемещения |
| `/orders` | Заказы на закупку (ADMIN/MANAGER) |
| `/locations` | Склады и локации |
| `/users` | Управление пользователями (ADMIN) |

## Роли

- **ADMIN** — полный доступ ко всему
- **MANAGER** — всё кроме управления пользователями и удаления товаров
- **STAFF** — просмотр + запись движений инвентаря

## Конфигурация

Прокси к API настроен в `vite.config.js`:

```js
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  }
}
```

Если бэкенд на другом порту — измени `target`.
