# ⚡ Niyantrit Quick Reference

## 🎯 Start in 30 Seconds

### Windows
```bash
setup.bat
```

### PowerShell
```bash
.\setup.ps1
```

### Manual
```bash
# Terminal 1
cd niyantrit-backend && python seed_database.py && python -m uvicorn main:app --port 8000

# Terminal 2
cd niyantrit-frontend && python -m http.server 3000
```

---

## 🔑 Test Logins

| Role | Email | Password |
|------|-------|----------|
| Citizen | `citizen@test.com` | `password123` |
| Contractor | `contractor@test.com` | `password123` |
| Official | `official@test.com` | `password123` |
| Admin | `admin@test.com` | `password123` |

---

## 🌐 URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000/login.html |
| API Docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health |

---

## 📊 What's Seeded

- ✅ 200 projects with risk scores
- ✅ 4 test user accounts  
- ✅ 5 sample complaints
- ✅ Calculated risk metrics

---

## 🛠️ Key Files

| File | Purpose |
|------|---------|
| `setup.bat` | Windows quick start |
| `setup.ps1` | PowerShell quick start |
| `seed_database.py` | Database seeding |
| `main.py` | FastAPI backend |
| `login.html` | Modern UI |
| `app.js` | Frontend logic |

---

## 🚀 User Roles

| Role | Can Do | Cannot Do |
|------|--------|----------|
| **Citizen** | Submit complaints, view projects | Resolve complaints, access admin |
| **Contractor** | Submit complaints, manage projects | Review all complaints, access admin |
| **Official** | Review complaints, route cases | Access full admin dashboard |
| **Admin** | Everything | (Nothing restricted) |

---

## 🐛 Troubleshooting

### Port in Use?
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Reset Database?
```bash
cd niyantrit-backend
del niyantrit.db
python seed_database.py
```

### Check Backend?
```bash
curl http://localhost:8000/health
```

---

## 📈 Features

✅ Authentication (JWT + RBAC)
✅ Project Management  
✅ Complaint Submission (Text & Voice)
✅ NLP Categorization
✅ Risk Scoring (0-100)
✅ Admin Dashboard
✅ Responsive UI

---

## 📚 Full Docs

- `README.md` - Project overview
- `SETUP_GUIDE.md` - Detailed setup
- `PHASE_1_TESTING.md` - Testing procedures

---

**Version**: 1.0.0 | **Status**: Production Ready | **Date**: April 4, 2026
