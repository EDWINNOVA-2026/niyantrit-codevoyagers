# 🚀 Niyantrit - Complete Setup Guide

**Quick Start**: 2 minutes to a fully populated system

---

## ⚡ Quick Start (Recommended)

### Option A: Windows (Easiest)
1. **Double-click**: `setup.bat` in the root folder
2. Wait for setup to complete
3. Open: `http://localhost:3000/login.html`

### Option B: PowerShell
```powershell
cd c:\Users\ADMIN\Downloads\niyantrit-CodeVoyagers
.\setup.ps1
```

### Option C: Manual Setup

#### Terminal 1 - Backend
```powershell
cd niyantrit-backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed_database.py  # Populate database
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

#### Terminal 2 - Frontend
```powershell
cd niyantrit-frontend
python -m http.server 3000
```

---

## 🔑 Test Credentials

After seeding, use these accounts to log in:

| Role | Email | Password |
|------|-------|----------|
| **Citizen** | `citizen@test.com` | `password123` |
| **Contractor** | `contractor@test.com` | `password123` |
| **Official** | `official@test.com` | `password123` |
| **Admin** | `admin@test.com` | `password123` |

---

## 📊 What Gets Seeded?

The `seed_database.py` script automatically:

✅ **Creates 4 Test Users** (one for each role)
✅ **Loads 200 Projects** from the dataset with:
   - Realistic project names and locations
   - Complete cost breakdowns (labor, material, other)
   - Start and completion dates
   - Status tracking

✅ **Calculates Risk Scores** for all projects using:
   - Complaint frequency analysis
   - Fund utilization ratios
   - Timeline adherence
   - Predictive models

✅ **Creates 5 Sample Complaints** (one per project category):
   - Safety Hazard
   - Labor Violation
   - Quality Issue
   - Project Delay
   - Fund Misuse

---

## 🌐 Access Points

Once running, access these URLs:

| Component | URL |
|-----------|-----|
| **Frontend** | http://localhost:3000/login.html |
| **API Docs (Swagger)** | http://localhost:8000/docs |
| **API Alternative Docs** | http://localhost:8000/redoc |
| **Health Check** | http://localhost:8000/health |

---

## 🎯 Recommended First Steps

### 1. Test User Authentication
- [ ] Login as Citizen
- [ ] Login as Official
- [ ] Login as Admin
- [ ] Verify different dashboards/permissions

### 2. Explore Projects
- [ ] View projects list (200 projects loaded)
- [ ] Click on a project to see details
- [ ] Check risk score (calculated per project)
- [ ] Review risk assessment breakdown

### 3. Submit a Complaint
- [ ] Select a project
- [ ] Submit text complaint
- [ ] Verify NLP categorization
- [ ] Check if properly routed

### 4. Try Voice Complaint
- [ ] Use Official or Citizen role
- [ ] Record audio complaint
- [ ] Verify transcription
- [ ] Check formal text generation

### 5. Admin Features
- [ ] Login as Admin
- [ ] View dashboard metrics
- [ ] See complaint statistics
- [ ] Review high-risk projects

---

## 🛠️ Troubleshooting

### Port Already in Use
```powershell
# Find and kill process on port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use different port
uvicorn main:app --port 8001
```

### Database Issues
```powershell
# Delete old database and reseed
cd niyantrit-backend
del niyantrit.db
python seed_database.py
```

### Dependencies Not Installing
```powershell
# Try upgrading pip first
python -m pip install --upgrade pip

# Then install requirements
pip install -r requirements.txt
```

### Backend Won't Start
```powershell
# Check if venv is activated
# Should see (venv) in terminal

# Try running without reload
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

---

## 📁 File Structure After Setup

```
niyantrit-CodeVoyagers/
├── setup.bat                          # Windows quick start
├── setup.ps1                          # PowerShell quick start
│
├── niyantrit-backend/
│   ├── venv/                          # Virtual environment
│   ├── niyantrit.db                   # ✨ SQLite database (created)
│   ├── seed_database.py               # 🌱 Database seeding script
│   ├── main.py                        # FastAPI app
│   ├── models.py                      # Database models
│   ├── database.py                    # SQLAlchemy config
│   ├── auth.py                        # Authentication
│   ├── requirements.txt               # Dependencies
│   ├── services/                      # AI & business logic
│   ├── middleware/                    # RBAC enforcement
│   └── jobs/                          # Background tasks
│
├── niyantrit-frontend/
│   ├── login.html                     # 🎨 Modern login page
│   ├── app.html                       # Main dashboard
│   ├── js/
│   │   ├── api-client.js              # API wrapper
│   │   └── app.js                     # UI logic
│   ├── css/
│   │   └── style.css                  # Styling
│   └── pages/                         # Component stubs
│
└── niyantrit_projects_dataset_200.json # 📊 Test data
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:3000
- [ ] Database file created (`niyantrit.db`)
- [ ] 200 projects loaded
- [ ] Can login with test credentials
- [ ] Risk scores calculated
- [ ] Sample complaints visible

---

## 🚀 Next Steps

### Development
- [ ] Modify authentication flow
- [ ] Add new API endpoints
- [ ] Customize complaint categories
- [ ] Adjust risk scoring algorithm

### Deployment
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Deploy backend to Render/Heroku
- [ ] Set up PostgreSQL database
- [ ] Configure environment variables

### Features
- [ ] Add WebSocket for real-time updates
- [ ] Implement file uploads
- [ ] Create mobile app
- [ ] Add notifications system

---

## 📚 Documentation Files

- **README.md** - Project overview and architecture
- **PHASE_1_TESTING.md** - Testing procedures
- **API_SETUP_GUIDE.md** - external API configuration
- **SETUP_GUIDE.md** - This file

---

## 🆘 Getting Help

### Check Logs
```powershell
# Backend logs show in terminal window
# Look for error messages there

# Frontend errors in browser DevTools (F12)
```

### Common Issues

**Q: Can't connect to API?**
- Make sure backend is running on port 8000
- Check CORS configuration in backend

**Q: Database won't seed?**
- Check Python version (need 3.8+)
- Verify all dependencies installed
- Check dataset file exists

**Q: Tests fail after seeding?**
- Delete database and reseed
- Check user credentials match seeded values

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review console/browser developer tools
3. Check backend server logs
4. Verify all services are running

---

**Status**: ✅ Ready to Use
**Last Updated**: April 4, 2026
**Version**: 1.0.0
