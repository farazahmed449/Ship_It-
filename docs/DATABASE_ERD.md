# Database ERD — PocketAI

The database has **10 tables**. All primary keys are **UUIDs**. Every user-owned table carries a `user_id` foreign key so data can be isolated per user.

```mermaid
erDiagram
    users ||--o{ income : has
    users ||--o{ budgets : has
    users ||--o{ categories : has
    users ||--o{ expenses : has
    users ||--o{ recurring_expenses : has
    users ||--o{ saving_goals : has
    users ||--o{ alerts : has
    users ||--o{ forecasts : has
    users ||--o{ monthly_reports : has

    budgets ||--o{ categories : contains
    categories ||--o{ expenses : groups
    categories ||--o{ recurring_expenses : groups
    categories |o--o{ alerts : "referenced by"

    users {
        uuid id PK
        string name
        string email UK
        string password_hash
        datetime created_at
    }

    income {
        uuid id PK
        uuid user_id FK
        float amount
        int month
        int year
        string source
        datetime created_at
    }

    budgets {
        uuid id PK
        uuid user_id FK
        int month
        int year
        float total_amount
        datetime created_at
    }

    categories {
        uuid id PK
        uuid budget_id FK
        uuid user_id FK
        string name
        float allocated_amount
        string color
        datetime created_at
    }

    expenses {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        float amount
        string description
        date date
        string ai_suggested_category
        boolean user_corrected
        string input_method
        datetime created_at
    }

    recurring_expenses {
        uuid id PK
        uuid user_id FK
        uuid category_id FK
        string name
        float amount
        int billing_date
        boolean is_active
        datetime created_at
    }

    saving_goals {
        uuid id PK
        uuid user_id FK
        string title
        float target_amount
        float saved_amount
        date deadline
        string status
        datetime created_at
    }

    alerts {
        uuid id PK
        uuid user_id FK
        uuid category_id FK "nullable"
        string type
        string message
        boolean is_read
        datetime created_at
    }

    forecasts {
        uuid id PK
        uuid user_id FK
        int month
        int year
        float projected_spending
        float projected_balance
        datetime generated_at
    }

    monthly_reports {
        uuid id PK
        uuid user_id FK
        int month
        int year
        float total_income
        float total_spent
        float total_saved
        text ai_summary
        datetime generated_at
    }
```

## Relationships

- **`users`** has many of everything — income, budgets, categories, expenses, recurring expenses, saving goals, alerts, forecasts, and monthly reports.
- **`budgets`** contains many **`categories`**.
- **`categories`** groups many **`expenses`** and many **`recurring_expenses`**.
- **`categories`** may be referenced by **`alerts`** (the `category_id` on an alert is **nullable** — some alerts are not tied to a specific category).

## Notes — Per-user data isolation

Every user-owned table includes a `user_id` foreign key referencing `users.id`. The backend filters **every** query by the authenticated user's id, so a user can only ever read or modify their own rows. Combined with UUID primary keys (which are non-sequential and non-guessable), this enforces strict per-user data isolation across the entire schema.
