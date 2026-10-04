# Карта возможностей ИИ

Адаптивное приложение для одного мероприятия: участники проходят короткий опрос с телефона, получают личный результат, а ведущий открывает dashboard на ноутбуке или проекторе.

## Что внутри

- участник: `/?s=demo`
- dashboard: `/dashboard?s=demo`
- личный результат: `/result/:id`
- PostgreSQL вместо Supabase
- YandexGPT для смысловой кластеризации задач
- локальная кластеризация, если ключ YandexGPT не задан или API недоступен
- CSV с датой, session slug, кодами и русскими названиями ответов
- автоматическое удаление ответов старше 30 дней при чтении/записи и отдельной cron-командой

## Переменные окружения

Обязательная:

```env
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DB?sslmode=require
```

Опциональные для YandexGPT:

```env
YANDEXGPT_API_KEY=...
YANDEXGPT_FOLDER_ID=...
# или вместо folder id можно задать полный model uri
YANDEXGPT_MODEL_URI=gpt://<folder-id>/yandexgpt-lite/latest
```

Если YandexGPT не настроен, dashboard работает с локальной группировкой.

## Подготовка базы

Выполните SQL из `db/init.sql` в PostgreSQL на Timeweb.

Создать новую группу вручную:

```sql
insert into survey_sessions (slug, title)
values ('alrosa-november', 'ALROSA · ноябрь');
```

Ссылки для этой группы:

- опрос: `https://<technical-timeweb-address>/?s=alrosa-november`
- dashboard: `https://<technical-timeweb-address>/dashboard?s=alrosa-november`

## Локальный запуск

```sh
npm install
npm run dev
```

Production-проверка:

```sh
npm run build
PORT=3000 npm start
```

## Timeweb Cloud

Рекомендуемый вариант: Node.js 22.

Build command:

```sh
npm ci && npm run build
```

Start command:

```sh
npm start
```

Cron для ежедневной очистки старых ответов:

```sh
npm run cleanup:old-responses
```

Даже без cron старые ответы удаляются при обычных действиях приложения, но cron закрывает случай долгих периодов без посещений.
