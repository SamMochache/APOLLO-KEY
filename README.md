# APOLLO-KEY
🚀 Bridging ISMS, IT, and operations to power a smarter, more connected education ecosystem.

## 🧱 Milestone 1 — Project Scaffold & Docker Setup ✅

### 🎯 Objective
Establish a working, containerized development environment that integrates:
- **Backend:** Django + Django REST Framework
- **Frontend:** React + TypeScript (Vite)
- **Database:** PostgreSQL
- **Containerization:** Docker & Docker Compose

This milestone ensures that all components can build, run, and communicate seamlessly before implementing application features.

---

### ⚙️ Achievements

| # | Task | Description | Status |
|---|------|--------------|--------|
| 1 | **Initialize Django Backend** | Created and structured Django project (`backend/`). | ✅ Completed |
| 2 | **Initialize React Frontend** | Scaffolded React project with Vite + TypeScript (`frontend/`). | ✅ Completed |
| 3 | **Dockerize Backend** | Added `Dockerfile` for Django backend with environment variables and dependencies. | ✅ Completed |
| 4 | **Dockerize Frontend** | Added `Dockerfile` for React app to build and serve via container. | ✅ Completed |
| 5 | **Setup docker-compose.yml** | Orchestrated backend, frontend, and PostgreSQL containers for local development. | ✅ Completed |
| 6 | **Configure PostgreSQL Database** | Integrated PostgreSQL connection via `.env` file and tested with Django migrations. | ✅ Completed |
| 7 | **Setup Environment Variables** | Created `.env` file at the project root (`/APOLLO-KEY/.env`) for shared variables. | ✅ Completed |
| 8 | **Add CORS Headers** | Installed and configured `django-cors-headers` to enable frontend-backend communication. | ✅ Completed |
| 9 | **Add Health Check Endpoint** | Added `/api/health/` endpoint to verify backend and frontend connectivity. | ✅ Completed |
| 10 | **Verify Integration** | Ran `docker compose up --build` to confirm all services build and run successfully. | ✅ Completed |

---

### 🧾 Environment Setup

#### 📂 Project Structure
key-international-school/
├─ backend/
│ ├─ Dockerfile
│ ├─ manage.py
│ ├─ requirements.txt
│ └─ config/
├─ frontend/
│ ├─ Dockerfile
│ ├─ package.json
│ └─ src/
├─ docker-compose.yml
├─ .env
└─ README.md
