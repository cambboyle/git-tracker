This repository contains a full-stack webhooks management platform. It is designed both as a learning playground and as a realistic, production-style application.

- **Backend:** [NestJS](https://nestjs.com/) + [TypeORM](https://typeorm.io/) + MySQL  
- **Frontend:** [React](https://react.dev/) + [Vite](https://vitejs.dev/)  
- **Auth:** JWT-based authentication with admin support

This document follows common industry best practices for documentation, onboarding, and operations.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)  
2. [Repository Structure](#repository-structure)  
3. [Prerequisites](#prerequisites)  
4. [Getting Started](#getting-started)  
   - [Backend Setup (`server`)](#backend-setup-server)  
   - [Frontend Setup (`client`)](#frontend-setup-client)  
   - [Running Both with Separate Terminals](#running-both-with-separate-terminals)  
5. [Environment Configuration](#environment-configuration)  
   - [Backend Environment](#backend-environment)  
   - [Frontend Environment](#frontend-environment)  
6. [Webhooks Application](#webhooks-application)  
   - [Core Concepts](#core-concepts)  
   - [Authentication & Authorization](#authentication--authorization)  
   - [Admin Features](#admin-features)  
   - [Key API Endpoints](#key-api-endpoints)  
7. [Development Workflow](#development-workflow)  
   - [Linting & Formatting](#linting--formatting)  
   - [Testing](#testing)  
   - [Database Migrations](#database-migrations)  
9. [Environments & Deployment](#environments--deployment)  
10. [Security & Best Practices](#security--best-practices)  
11. [Troubleshooting](#troubleshooting)  
12. [Roadmap / Future Improvements](#roadmap--future-improvements)  
13. [License](#license)

---

## Architecture Overview

This repository provides a webhooks platform with a backend API and a frontend dashboard.

**Webhooks Platform**
- A multi-entity system that allows:
  - Defining *events* that occur in the system.
  - Configuring *destinations* (HTTP endpoints) to receive webhook calls.
  - Creating *routing rules* that describe which events go to which destinations.
  - Tracking *deliveries* (attempts to send webhooks) and their status.
- Exposes a RESTful API secured with JWT.
- Dashboard UI for:
  - Viewing events and deliveries.
  - Managing destinations and routing rules.
  - Admin-only management of users and configuration.

---

## Repository Structure

A typical structure (adjust paths to your actual layout):

```text
.
├─ server/                     # NestJS backend (webhooks API)
│  ├─ src/
│  │  ├─ auth/                 # Auth module (JWT, guards, strategies)
│  │  ├─ users/                # Users module (includes admin user management)
│  │  ├─ events/               # Events domain logic
│  │  ├─ destinations/         # Destinations module (+ admin controller)
│  │  ├─ routing-rules/        # Routing rules module (+ admin controller)
│  │  ├─ deliveries/           # Deliveries module
│  │  ├─ common/               # Shared guards, interceptors, utils
│  │  └─ main.ts
│  ├─ test/                    # Backend tests
│  ├─ ormconfig / config/      # TypeORM / DB configuration
│  ├─ package.json
│  └─ tsconfig.json
│
├─ client/                     # React + Vite frontend
│  ├─ src/
│  │  ├─ api/                  # API client, axios instance, auth integration
│  │  ├─ auth/                 # Auth context, hooks, components
│  │  ├─ components/           # Shared UI components
│  │  ├─ views/                # Feature-level pages (events, deliveries, admin views, etc.)
│  │  └─ main.tsx / App.tsx
│  ├─ public/
│  ├─ index.html
│  ├─ package.json
│  └─ vite.config.ts
│
├─ .editorconfig
├─ .gitignore
├─ README.md                   # You are here
└─ (Optional) docker-compose.yml / scripts / CI configs
```

---

## Prerequisites

To run this project locally, you will need:

- **Node.js**: LTS version (e.g., 18.x or 20.x)  
- **npm** or **yarn**: choose one and use it consistently  
- **MySQL** (or compatible, e.g., MariaDB) for the webhooks backend  
- **Git** for version control  
- (Optional) **Docker + Docker Compose**, if you want to containerize services later  

Verify versions:

```bash
node -v
npm -v
mysql --version
```

---

## Getting Started

Clone the repository:

```bash
git clone <your-repo-url> webhooks
cd webhooks
```

Install dependencies for both backend and frontend.

### Backend Setup (`server`)

```bash
cd server
npm install

# Copy environment file example if provided
cp .env.example .env  # adjust if file name differs

# Update .env with your database credentials and JWT secrets
# Then run database migrations / schema sync as your config requires:
npm run build      # Type-check & compile
npm run start:dev  # Start NestJS in watch mode
```

By default, the backend typically listens on `http://localhost:3000`. Adjust as per your `main.ts` configuration.

### Frontend Setup (`client`)

In a new terminal:

```bash
cd client
npm install

# Copy environment file example if provided
cp .env.example .env  # adjust if file name differs

# Update API base URL to point to your running backend (e.g., http://localhost:3000)
npm run dev  # Vite dev server, default http://localhost:5173
```

---

### Running Both with Separate Terminals

1. Terminal 1:

```bash
cd server
npm run start:dev
```

2. Terminal 2:

```bash
cd client
npm run dev
```

3. Open the frontend in your browser (Vite usually prints the URL, e.g., `http://localhost:5173`).

---

## Environment Configuration

### Backend Environment

A typical `.env` for NestJS + TypeORM might include:

```env
# Application
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_NAME=webhooks

# JWT
JWT_ACCESS_TOKEN_SECRET=change-me-access
JWT_ACCESS_TOKEN_EXPIRY=15m
JWT_REFRESH_TOKEN_SECRET=change-me-refresh
JWT_REFRESH_TOKEN_EXPIRY=7d

# CORS / Frontend URL
CLIENT_URL=http://localhost:5173
```

Best practice: Never commit real secrets. Use `.env.example` to show required variables and keep `.env` in `.gitignore`.

Ensure your NestJS configuration (e.g., in a config module or `app.module.ts`) reads from `process.env`.

### Frontend Environment

For React + Vite, environment variables are typically prefixed with `VITE_`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Note: Vite exposes only `VITE_`-prefixed variables to the browser.

---

## Webhooks Application

### Core Concepts

- **Events:** Domain events that your system emits (e.g., `user.created`, `invoice.paid`).
- **Destinations:** External HTTP endpoints that will receive webhook POSTs.
- **Routing Rules:** Rules that define which events are delivered to which destinations (e.g., “send `user.created` events to `https://example.com/webhooks/user`”).
- **Deliveries:** Individual attempts to send a webhook payload to a destination, with status, timestamps, and (optionally) error details.

### Authentication & Authorization

- **Authentication** is based on **JWT**:
  - `POST /auth/login` returns:
    - `accessToken`
    - `refreshToken`
    - `user` object (including `isAdmin`)
  - `POST /auth/refresh` issues new tokens using a valid refresh token.
  - `POST /auth/logout` invalidates a refresh token (implementation-dependent).
  - `GET /auth/me` returns the currently authenticated user and their flags (including `isAdmin`).

- **Authorization**:
  - Regular endpoints require a valid access token in `Authorization: Bearer <token>`.
  - Admin endpoints require:
    - Valid JWT **and**
    - `user.isAdmin === true` (checked by an `AdminGuard` on the backend).

### Admin Features

Admin users have access to:

- Manage **users**:
  - Create, update, delete users.
  - Toggle admin status (`isAdmin`) with appropriate safeguards.
- Manage **destinations**:
  - CRUD operations for webhook destinations.
- Manage **routing rules**:
  - CRUD routing rules to control event → destination mapping.

On the frontend, admin users will see additional navigation items and views (e.g., Users, Destinations (Admin), Routing Rules (Admin)).

### Key API Endpoints

The following is a conceptual overview; adjust paths to reflect your actual code.

**Auth**

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET  /auth/me`

**Events**

- `GET  /api/events`
- `GET  /api/events/:id`
- (Other CRUD endpoints as implemented.)

**Destinations**

- `GET    /api/destinations`
- `POST   /api/destinations`
- `PATCH  /api/destinations/:id`
- `DELETE /api/destinations/:id`

**Routing Rules**

- `GET    /api/routing-rules`
- `POST   /api/routing-rules`
- `PATCH  /api/routing-rules/:id`
- `DELETE /api/routing-rules/:id`

**Deliveries**

- `GET  /api/deliveries`
- `GET  /api/deliveries/:id`

**Admin Endpoints** (protected by `JwtAuthGuard` + `AdminGuard`)

- `/api/admin/destinations` (CRUD)
- `/api/admin/routing-rules` (CRUD)
- `/api/admin/users` (CRUD)

Refer to the NestJS controllers and DTOs for full details on request/response schemas.

---

## Development Workflow

### Linting & Formatting

Recommended tools (depending on what you’ve wired up):

- **Backend:**
  - ESLint (`npm run lint`)
  - Prettier (`npm run format` or integrated as part of lint)

- **Frontend:**
  - ESLint + TypeScript rules
  - Prettier

Example commands:

```bash
# Backend
cd server
npm run lint
npm run format

# Frontend
cd client
npm run lint
npm run format
```

Best practice: Configure a pre-commit hook (e.g., using Husky) to run lint/format on staged files.

### Testing

Backend:

```bash
cd server
npm test          # Run unit tests
npm run test:e2e  # If end-to-end tests are configured
```

Frontend:

```bash
cd client
npm test          # Jest / Vitest, depending on setup
```

Tests should cover:

- Auth/guard logic (especially admin checks).
- Core service/business logic (events, routing rules, deliveries).
- Critical React components (auth flow, admin forms) where practical.

### Database Migrations

If you are using TypeORM migrations:

```bash
cd server

# Generate a new migration after making entity changes
npm run typeorm migration:generate -- -n <MigrationName>

# Run migrations
npm run typeorm migration:run

# Revert last migration (if necessary)
npm run typeorm migration:revert
```

Keep migrations in version control and run them in CI/CD pipelines as part of deployments.

---

## Environments & Deployment

Common environments:

- **Local development:** `NODE_ENV=development`.  
- **Staging:** Used for integration testing, may share similar config to production but with test data.  
- **Production:** Hardened configuration, secrets stored securely (e.g., in a secrets manager).

Best practices:

- Use separate `.env` files or environment-variable injection per environment.
- Do **not** hard-code secrets in code or commit them to Git.
- Consider Docker for repeatable deployment:
  - `docker-compose.yml` to run:
    - `server`
    - `client` (or serve static build via nginx)
    - `mysql`

High-level deployment steps:

1. Build server:
   - `cd server && npm run build`
2. Build client:
   - `cd client && npm run build`
3. Serve:
   - Serve `client/dist` via a static server or CDN.
   - Run `server/dist/main.js` via `node` or a process manager like PM2, or inside Docker.

---

## Security & Best Practices

- **JWT Handling:**
  - Short-lived access tokens; longer-lived refresh tokens.
  - Store refresh tokens securely (e.g., HTTP-only cookies in production).
  - Rotate secrets if compromised.

- **Admin Guardrails:**
  - Prevent deleting the last admin user.
  - Require confirmation for destructive operations (deleting users, destinations, or routing rules).

- **Validation:**
  - Use DTOs with `class-validator` on all input data (especially admin endpoints).
  - Return meaningful but not overly detailed error messages (avoid leaking internals).

- **CORS & CSRF:**
  - Configure CORS to trust only known origins (e.g., your frontend URL).
  - If using cookies, consider CSRF protection strategies.

- **Logging & Monitoring:**
  - Log important backend events: login failures, admin actions, webhook delivery failures.
  - Consider structured logging for easier analysis.

---

## Troubleshooting

Common issues & tips:

1. **Frontend cannot reach backend**
   - Check `VITE_API_BASE_URL` in `client/.env`.
   - Ensure backend is listening on the correct host/port and CORS is configured.

2. **Database connection errors**
   - Verify MySQL is running.
   - Confirm `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME` in `server/.env`.
   - Ensure the DB user has the appropriate permissions.

3. **JWT / Auth issues**
   - Ensure frontend sends `Authorization: Bearer <access_token>` header.
   - Check `JWT_ACCESS_TOKEN_SECRET` and `JWT_REFRESH_TOKEN_SECRET` are set and match between issuing and validating components.
   - Validate token expiry settings; too short can cause frequent renewals, too long can be a security risk.

4. **Admin not recognized**
   - Ensure the `User` entity has an `isAdmin` field and it’s mapped correctly to the DB.
   - Confirm your login response includes `isAdmin` and that the frontend stores/uses it.
   - Verify that the `AdminGuard` checks `req.user.isAdmin`.

5. **WebSockets not connecting (PoC)**
   - Verify the WebSocket gateway namespace (e.g., `/chat`) matches the frontend client URL and namespace.
   - Check CORS / WebSocket origins.
   - Ensure any required authentication is provided (if implemented).

---

## Roadmap / Future Improvements

Potential next steps and enhancements:

- **Webhooks Application**
  - Add DTOs + `class-validator` for all admin and public endpoints.
  - Implement soft deletes or an audit log for critical entities (users, routing rules, destinations).
  - Add pagination, filtering, and search on tables (events, deliveries, users).
  - Implement rate limiting and IP allowlists/denylists for sensitive endpoints.
  - Add end-to-end tests for the core flows (login → configure destination → trigger event → verify delivery).



- **DevOps**
  - Add CI pipeline (GitHub Actions, GitLab CI, etc.) for:
    - Linting
    - Tests
    - Build verification
  - Add Docker images for backend and frontend.
  - Automate database migrations on deploy.

---

## License

Specify your chosen license here (e.g., MIT, Apache 2.0, proprietary).

Example:

```text
This project is licensed under the MIT License.
```

Be sure to include an actual `LICENSE` file at the root of the repository if you intend to open source or share this project.
