@'
#!/bin/sh
# Ждем пока база данных будет готова
sleep 5

# Выполняем миграции
npx prisma migrate deploy

# Запускаем приложение
npm start
'@ | Out-File -FilePath entrypoint.sh -Encoding UTF8
