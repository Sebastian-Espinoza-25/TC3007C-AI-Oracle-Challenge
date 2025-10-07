# ORACLE-AI | Backend

Backend API for the **ORACLE-AI** system, built with [Python](https://www.python.org/) and **Flask**.  
This service handles the API logic, routes, and database management for the ORACLE-AI ecosystem.

---

## Features

- Modular and scalable backend architecture  
- RESTful API endpoints for all system operations  
- Environment-based configuration using `.env`  
- Database integration and service layer separation  
- Ready for frontend communication and external services  
- Includes testing setup for quality assurance  

---

## Requirements

- Python 3.10+  
- Virtual environment (`venv`)  
- Dependencies installed from `requirements.txt`

---

## Installation & Setup

```bash
# Clone repository
git clone https://github.com/Sebastian-Espinoza-25/TC3007C-AI-Oracle-Challenge.git
cd TC3007C-AI-Oracle-Challenge/backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # (Windows: venv\Scripts\activate)

# Install dependencies
pip install -r requirements.txt

# Run the backend
python app/main.py
```

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application entry point
│   ├── routes.py            # Main routes file
│   ├── config/              # Configuration files
│   ├── database/            # Database management
│   ├── models/              # Data models
│   ├── routes/              # Modular route definitions
│   ├── services/            # Business logic layer
│   ├── tests/               # Test files
│   └── utils/               # Utility functions
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

---

## Git Workflow

To keep the workflow clean and organized, we follow a **feature-based branching strategy**:

### Main branch
- **`main`** → Stable production branch.  

### Working branches
- **`feature/*`** → Development of new backend features or services.  
  Example: `feature/authentication-api`
- **`fix/*`** → Bug fixes in backend logic.  
  Example: `fix/jwt-expiration-bug`
- **`chore/*`** → Maintenance tasks (configs, dependencies, etc).  
  Example: `chore/update-dockerfile`
- **`docs/*`** → Documentation changes.  
  Example: `docs/api-endpoints`
- **`hotfix/*`** → Urgent fixes applied directly to `main`.  
  Example: `hotfix/payment-service-down`

---

## Workflow

1. Create a branch from `main`  
2. Push the branch to remote  
3. Open a **Pull Request (PR)** for review  
4. Merge manually into `main` once the feature or fix is complete  
5. Delete the local branch if no longer needed  

---

## Commit Conventions

Examples of valid commit messages:
- `feat: add authentication middleware`
- `feat: implement user registration endpoint`
- `fix: correct database connection pool`
- `chore: update environment variables`
- `docs: add API usage guide`

---

## Quick Example

```bash
```bash
# Create branch from main
git checkout main
git pull origin main
git checkout -b feature/authentication-api

# Work and commit
git add .
git commit -m "feat: add authentication middleware"

# Push branch
git push -u origin feature/authentication-api

# Create PR and merge through GitHub interface
# After merge, cleanup local branch
git checkout main
git pull origin main
git branch -d feature/authentication-api
```

---

### Running Tests
```bash
# Run all tests
python -m pytest app/tests/

# Run with coverage
python -m pytest app/tests/ --cov=app
```

---

## 🚀 Deployment

TBD - Deployment instructions will be added once the infrastructure is defined.

---

## 🤝 Contributing

Please follow the established workflow and commit conventions when contributing to this project.