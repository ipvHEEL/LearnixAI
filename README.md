# LearnixAI

Проект состоит из фронтенда на React (Create React App) и бэкенда на FastAPI, который подтягивает RSS‑ленты Хабра, ранжирует статьи по интересам пользователя с помощью `sentence-transformers`, и отдает результаты через HTTP API.【F:backend/main.py†L1-L67】【F:backend/service/data/api_load.py†L1-L83】【F:backend/service/data/neural_ranker.py†L1-L35】【F:frontend/README.md†L1-L70】

## Быстрый старт

### Вариант 1: Docker Compose (рекомендуется)

```bash
docker compose up --build
```

Что будет запущено:
- Бэкенд FastAPI: http://localhost:8000 (контейнер собирается из `backend/dockerfile`).【F:docker-compose.yml†L1-L14】【F:backend/dockerfile†L1-L17】
- Фронтенд (статическая сборка CRA в Nginx): http://localhost:3000 (контейнер собирается из `frontend/dockerfile`).【F:docker-compose.yml†L1-L14】【F:frontend/dockerfile†L1-L12】

> Примечание: бэкенд использует модель `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`. При первом запуске модель будет скачана из сети, что может занять время и требует доступа в интернет.【F:backend/service/data/neural_ranker.py†L1-L35】

### Вариант 2: локальный запуск без Docker

#### 2.1. Бэкенд

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
fastapi dev main.py --port 8000
```

Бэкенд слушает порт **8000** и разрешает CORS для `http://localhost:3000` и `http://127.0.0.1:3000`.【F:backend/main.py†L11-L25】

#### 2.2. Фронтенд

```bash
cd frontend
npm install
npm start
```

Фронтенд будет доступен на **http://localhost:3000** (dev‑режим CRA).【F:frontend/README.md†L10-L19】【F:frontend/package.json†L1-L27】

## Архитектура и компоненты

### 1) Бэкенд (FastAPI)

**Точки входа (API):**
- `GET /news` — возвращает ранжированные новости по захардкоженным интересам пользователя и ограничивает выдачу топ‑5 по релевантности.【F:backend/main.py†L31-L56】
- `POST /login` — простая аутентификация (заглушка): логин `admin`, пароль `password`.【F:backend/main.py†L58-L63】【F:backend/service/auth/auth_service.py†L1-L13】
- `POST /signup` — регистрация (заглушка): валидирует поля и возвращает фиктивного пользователя.【F:backend/main.py†L65-L67】【F:backend/service/auth/auth_service.py†L10-L16】

**Сервисные модули:**
- `service/data/api_load.py` — загрузка RSS‑лент и парсинг статей (очистка HTML, устранение дублей по URL).【F:backend/service/data/api_load.py†L1-L83】
- `service/data/neural_ranker.py` — вычисление эмбеддингов и ранжирование по косинусной близости.【F:backend/service/data/neural_ranker.py†L1-L35】
- `service/auth/auth_service.py` — простейший сервис авторизации/регистрации (заглушки).【F:backend/service/auth/auth_service.py†L1-L16】
- `service/user/user.py` — модель пользователя на уровне Python‑класса.【F:backend/service/user/user.py†L1-L11】

**Типичные ответы**

`GET /news` возвращает:

```json
{
  "learner": "Андрей",
  "interests": ["математика", "алгебра", "геометрия"],
  "total_articles": 123,
  "articles": [
    {
      "title": "...",
      "description": "...",
      "url": "...",
      "publishedAt": "...",
      "full_text": "...",
      "relevance_score": 0.123
    }
  ]
}
```

Данные формируются из RSS‑лент и ранжируются по интересам с добавлением `relevance_score`.【F:backend/main.py†L31-L56】【F:backend/service/data/api_load.py†L1-L83】【F:backend/service/data/neural_ranker.py†L1-L35】

### 2) Фронтенд (React + CRA)

Фронтенд собран на Create React App и включает стандартные скрипты `start`, `build`, `test`, `eject`.【F:frontend/package.json†L1-L27】【F:frontend/README.md†L1-L70】

**Сборка и деплой:**
- `npm run build` формирует статический каталог `build` (используется в Docker‑образе Nginx).【F:frontend/README.md†L20-L27】【F:frontend/dockerfile†L1-L12】

## Инфраструктура и деплой

### Docker

**Бэкенд**:
- Базовый образ: `python:3.11-slim`.【F:backend/dockerfile†L1-L17】
- Запуск: `fastapi dev main.py --port 8000`.【F:backend/dockerfile†L1-L17】

**Фронтенд**:
- Сборка: `node:20-alpine` (build stage).
- Раздача: `nginx:alpine`.【F:frontend/dockerfile†L1-L12】

### Порты

| Компонент | Порт | Назначение |
| --- | --- | --- |
| Бэкенд | 8000 | HTTP API FastAPI |
| Фронтенд | 3000 | UI (Nginx/CRA) |

Порты фиксированы в `docker-compose.yml`.【F:docker-compose.yml†L1-L14】

## Требования и зависимости

### Бэкенд

Зависимости задаются в `backend/requirements.txt` и включают:
- `fastapi`, `uvicorn`, `requests`, `feedparser` и т.д.
- `torch`, `sentence-transformers` для ранжирования.

> Важно: `sentence-transformers` при первом запуске скачивает модель из сети.【F:backend/service/data/neural_ranker.py†L1-L35】

### Фронтенд

Основные зависимости: `react`, `react-dom`, `react-scripts`, `@testing-library/*`.【F:frontend/package.json†L1-L27】

## Запуск и тестирование

### Бэкенд

Запуск в dev‑режиме:

```bash
fastapi dev main.py --port 8000
```

Тестовый запрос:

```bash
curl http://localhost:8000/news
```

### Фронтенд

```bash
npm test
```

Команда запускает стандартный test runner CRA в watch‑режиме.【F:frontend/README.md†L20-L24】

## Конфигурация и расширение

### RSS‑источники

Список RSS‑лент задается в `RSS_SOURCES` и может быть расширен/изменен вручную (например, добавлением других хабов или источников).【F:backend/service/data/api_load.py†L6-L33】

### Пользовательские интересы

Сейчас интересы пользователя захардкожены в обработчике `GET /news`. Для поддержки реальных пользователей стоит заменить этот блок на получение интересов из БД или профиля пользователя.【F:backend/main.py†L31-L41】

## Ограничения и известные нюансы

1. **Аутентификация и регистрация** — заглушки; логика хранения пользователей отсутствует (все in‑memory).【F:backend/service/auth/auth_service.py†L1-L16】
2. **Сетевые зависимости** — RSS и модель требуют внешних запросов; при отсутствии сети `/news` может вернуть пустую выдачу или работать медленно.【F:backend/service/data/api_load.py†L36-L55】【F:backend/service/data/neural_ranker.py†L1-L35】
3. **Ранжирование** — все статьи кодируются целиком в памяти; при большом объеме источников это может требовать больше ресурсов (CPU/RAM).【F:backend/service/data/neural_ranker.py†L14-L35】

## Структура репозитория

```
.
├── backend/          # FastAPI + сервисы данных и авторизации
├── frontend/         # React (Create React App)
├── docker-compose.yml
└── README.md
```

## FAQ / Troubleshooting

**Q: Бэкенд долго стартует или падает на ранжировании.**  
A: Проверьте доступ в интернет и наличие ресурсов. Модель sentence-transformers скачивается и инициализируется при первом запуске, что может занять время.【F:backend/service/data/neural_ranker.py†L1-L35】

**Q: UI не видит бэкенд.**  
A: Убедитесь, что бэкенд доступен на `http://localhost:8000`, а CORS разрешает `http://localhost:3000`.【F:backend/main.py†L11-L25】

