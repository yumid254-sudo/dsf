# Vercel deployment configuration guide

## Подготовка к деплою

Проект готов к деплою на Vercel. Включены следующие компоненты:

### 1. **vercel.json** - Конфигурация развертывания
- Настройка build команды
- Направление выходных файлов на `client/dist`
- Переписывание маршрутов API

### 2. **.vercelignore** - Исключаемые файлы
- Git файлы
- node_modules и логи
- Переменные окружения (.env.local)

### 3. **server/api/index.js** - Serverless функция
- Express приложение для API
- CORS поддержка
- Совместимо с Vercel Functions

### 4. **Обновленные scripts**
- `npm run vercel-build` - сборка для Vercel
- `npm run install-all` - установка всех зависимостей

## Как задеплоить на Vercel

### Вариант 1: Через CLI
```bash
npm install -g vercel
vercel
```

### Вариант 2: Через Web Dashboard
1. Перейти на https://vercel.com
2. Импортировать репозиторий GitHub/GitLab
3. Vercel автоматически обнаружит vercel.json
4. Задать переменные окружения в настройках
5. Задеплоить

## Переменные окружения

Добавить в Vercel Dashboard > Settings > Environment Variables:
```
NODE_ENV=production
PORT=5001
```

## Структура проекта для Vercel

```
root/
├── vercel.json (конфиг Vercel)
├── .vercelignore (исключаемые файлы)
├── package.json (root)
├── client/ (frontend - Vite)
│   ├── dist/ (будет создана при build)
│   └── vite.config.js (обновлен для production)
└── server/ (backend - Express)
    ├── api/
    │   └── index.js (serverless функция)
    └── src/
        └── server-mock.js
```

## Типичные проблемы и решения

### API не доступен
- Убедитесь, что в client коде используется `/api/...` маршруты
- Vercel автоматически перенаправит на serverless функцию

### Статические файлы не грузятся
- Убедитесь, что `client/dist` содержит build файлы
- Проверьте, что Vite правильно собирает проект

### Ошибки зависимостей
- Проверьте все package.json файлы
- Убедитесь, что `npm run install-all` работает локально

## Следующие шаги

1. Создайте git репозиторий (если его нет)
2. Закоммитьте все файлы
3. Залейте на GitHub
4. Создайте аккаунт на Vercel
5. Импортируйте проект
6. Задайте переменные окружения
7. Задеплойте!
