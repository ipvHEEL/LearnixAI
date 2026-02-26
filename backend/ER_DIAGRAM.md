# ER Diagram (LearnixAI)

```mermaid
erDiagram
    USERS ||--|| USER_PROFILE : has
    USERS ||--o{ USER_INTERESTS : stores

    USERS {
      int user_id PK
      text user_name UNIQUE
      text email UNIQUE
      text password_hash
      text current_jwt
      timestamp created_at
    }

    USER_PROFILE {
      int user_id PK, FK
      text first_name
      text last_name
      int age
      text city
    }

    USER_INTERESTS {
      int id PK
      int user_id FK
      text interest
    }
```

- `USERS` хранит логин, email, хэш пароля и текущий JWT токен.
- `USER_PROFILE` хранит личные данные пользователя.
- `USER_INTERESTS` хранит список интересов (по одной записи на интерес).
