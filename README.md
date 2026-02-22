# Disaster Response & Relief Coordination Platform

A modern responsive React frontend for connecting victims, volunteers, and NGOs during emergencies.

## Theme

- Emergency disaster management, clean humanitarian design
- Colors: red, orange, white, dark blue

## Features

- **Homepage**: Hero, role cards (Request Help, Volunteer, Admin), CTA, disaster-awareness background
- **Request Help**: Form (name, phone, help type, description, lat/long), Detect My Location, Submit; API-ready POST
- **Volunteer Dashboard**: Requests list (cards/table), Accept / Mark Completed, status badges (Pending/Accepted/Completed), sidebar, search/filter by help type
- **Admin Dashboard**: Stats cards, requests table, status filters, activity timeline, chart placeholders, dark/light style
- **Map View**: Full-screen Leaflet map, markers with popups (help type, name, status), sidebar with live requests, legend (Red=Rescue, Orange=Medicine, Green=Food)
- **Notifications**: Toast notifications for new request, volunteer accepted, request completed

## Setup

```bash
npm install
```

## Run (development)

### Option A: Run both frontend and backend (full app)

**Terminal 1 – Backend (Flask)**  
From the project root:

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend runs at **http://localhost:5000**.

**Terminal 2 – Frontend (React)**  
From the project root:

```bash
npm install
npm run dev
```

Frontend runs at **http://localhost:5173** (or the port Vite shows).

**Connect frontend to backend:**  
In the project root, create or edit `.env`:

```
VITE_API_URL=http://localhost:5000
VITE_USE_MOCK=false
```

Restart the frontend (`npm run dev`) after changing `.env`. The React app will then use the Flask API.

---

### Option B: Frontend only (mock API)

- In `.env` set `VITE_USE_MOCK=true` (no backend needed).
- Run: `npm run dev`
- The app uses in-memory mock data.

## Connect to your API

1. Set `VITE_API_URL` in `.env` to your backend base URL (e.g. `https://api.example.com`).
2. Leave `VITE_USE_MOCK` unset or set to `false`.

Expected endpoints:

- `POST /requests` – create help request (body: fullName, phoneNumber, helpType, description, latitude, longitude)
- `GET /requests` – list requests (optional query: status, helpType)
- `GET /requests/:id` – get one request
- `PATCH /requests/:id/accept` – volunteer accepts
- `PATCH /requests/:id/complete` – mark completed
- `GET /admin/stats` – dashboard stats (totalRequests, pendingRequests, activeVolunteers, completedRequests)
- `GET /admin/activity` – activity timeline

## Build

```bash
npm run build
```

Output is in `dist/`.
Email: admin@dm.com
Password: 12345
