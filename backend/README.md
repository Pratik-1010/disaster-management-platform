# Disaster Response & Relief – Flask Backend

REST API for the Disaster Response & Relief Coordination Platform.

## Run

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server: **http://localhost:5000**

## Database

- **SQLite** file: `backend/relief.db` (created automatically on first run)
- Table: `requests` (id, name, phone, help_type, description, latitude, longitude, status, created_at)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/request | Create help request (JSON body) |
| GET | /api/requests | List all requests |
| GET | /api/requests/\<id\> | Get one request by id |
| GET | /api/requests/\<status\> | List by status (pending, accepted, completed) |
| PUT/PATCH | /api/request/\<id\>/accept | Accept request (volunteer) |
| PUT/PATCH | /api/requests/\<id\>/accept | Same (plural path) |
| PUT/PATCH | /api/request/\<id\>/complete | Mark completed |
| PUT/PATCH | /api/requests/\<id\>/complete | Same (plural path) |
| GET | /api/admin/stats | Dashboard stats |
| GET | /api/admin/activity | Activity timeline (placeholder) |

## Create request (POST /api/request)

```json
{
  "name": "Jane Doe",
  "phone": "+1234567890",
  "help_type": "Food",
  "description": "Need food and water.",
  "latitude": 18.52,
  "longitude": 73.85
}
```

`help_type` must be one of: **Food**, **Medicine**, **Rescue**, **Shelter**.

## Connect frontend

In the React app `.env`:

```
VITE_API_URL=http://localhost:5000
VITE_USE_MOCK=false
```

Then run the Flask backend and the Vite dev server; the frontend will use the live API.
