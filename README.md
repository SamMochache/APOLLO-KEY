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

---

## 🧱 Milestone 2 — Authentication & User Management ✅

### 🎯 Objective  
Implement a **secure, scalable, and role-based authentication system** that integrates seamlessly between the **Django REST Framework** backend and the **React (Vite + TypeScript)** frontend — all within the Dockerized environment established in Milestone 1.  

This milestone ensures users can register, log in, manage their accounts, and reset passwords through email verification.

---

### ⚙️ Achievements  

| # | Task | Description | Status |
|---|------|--------------|--------|
| 1 | **Install & Configure Djoser + JWT** | Integrated `Djoser` and `djangorestframework-simplejwt` to handle registration, login, logout, and token authentication. | ✅ Completed |
| 2 | **Custom User Model** | Extended Django’s `AbstractUser` to support different user roles (Admin, Teacher, Student). | ✅ Completed |
| 3 | **Role-Based Access Control** | Implemented role-specific views and API endpoints using DRF permissions and decorators. | ✅ Completed |
| 4 | **Frontend Authentication Integration** | Connected React authentication pages (login, register, logout) with Django backend APIs using Axios and JWT tokens. | ✅ Completed |
| 5 | **Password Reset via Email** | Configured Djoser’s password reset functionality using `EMAIL_BACKEND` and custom templates. | ✅ Completed |
| 6 | **Email & Token Routing Fix** | Fixed routing issues by renaming `email.py` → `emails.py`, setting up correct domain handling, and ensuring tokenized URLs work across frontend and backend. | ✅ Completed |
| 7 | **Environment Configuration** | Added necessary variables in `.env` (e.g., `DOMAIN`, `SITE_NAME`, `FRONTEND_URL`, and email credentials). | ✅ Completed |
| 8 | **Docker Integration Verified** | Confirmed all authentication features (JWT, password reset, email sending) work properly inside Docker containers. | ✅ Completed |
| 9 | **Frontend UI Enhancements** | Added loading states, error messages, and success feedback for auth-related pages. | ✅ Completed |
| 10 | **End-to-End Testing** | Verified full user flow: registration → login → forgot password → email verification → password reset → login success. | ✅ Completed |

---

### 🧾 Environment Setup  

#### 📂 Project Structure  
APOLLO-KEY/
├─ backend/
│ ├─ config/
│ ├─ users/
│ │ ├─ models.py
│ │ ├─ views.py
│ │ ├─ serializers.py
│ │ └─ emails.py
│ ├─ Dockerfile
│ ├─ manage.py
│ └─ requirements.txt
├─ frontend/
│ ├─ src/
│ │ ├─ pages/
│ │ │ ├─ Login.jsx
│ │ │ ├─ Register.jsx
│ │ │ ├─ ForgotPassword.jsx
│ │ │ └─ ResetPasswordConfirm.jsx
│ ├─ Dockerfile
│ ├─ vite.config.ts
│ └─ package.json
├─ docker-compose.yml
├─ .env
└─ README.md