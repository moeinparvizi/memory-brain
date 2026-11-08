# 🎬 Memory Brain — Live Demo

## Demo Credentials

| Field | Value |
|-------|-------|
| **Username** | `demo` |
| **Password** | `demo123` |

## How to Run the Demo

### Option 1: Local Development

```bash
# Clone the repository
git clone https://github.com/moeinparvizi/memory-brain.git
cd memory-brain

# Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev        # http://localhost:3001

# Frontend (new terminal)
cd ../frontend
npm install
npm start          # http://localhost:4201
```

Open **http://localhost:4201/login** and sign in with:
- Username: `demo`
- Password: `demo123`

### Option 2: Docker

```bash
docker-compose up --build
```

- Frontend: http://localhost:4200
- Backend:  http://localhost:3000

## Demo Features

After login you can explore:
- Dashboard overview
- Schedule & time blocks
- Workout tracker
- Supplement reminders
- Finance tracker
- Habits checklist
- Resources & roadmap
- Settings

## Backend API

- Health: `http://localhost:3001/api/v1/health`
- Login: `POST http://localhost:3001/api/v1/auth/login` with `{ "username": "demo", "password": "demo123" }`
