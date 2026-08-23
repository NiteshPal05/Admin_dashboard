# Admin Dashboard

A full-stack admin dashboard with a React frontend, a lightweight Node.js API, JWT authentication, dashboard analytics, and user management.

## Live Demo

[Open Admin Dashboard](https://admin-dashboard110.netlify.app/)

## Deployment

| Layer | Platform |
| --- | --- |
| Frontend | Netlify |
| Backend API | Render |
| Database | MongoDB Atlas |

## Tech Stack

- React
- Node.js + native HTTP server
- MongoDB Atlas
- JWT authentication
- Axios
- Lucide React icons

## Project Structure

```text
frontend/   React dashboard UI
backend/    Node API
```

## Run Locally

Install dependencies once from the project root:

```bash
npm install
```

Then run each app from its own folder:

- Frontend:

```bash
cd backend
npm run dev
```

- Backend:

```bash
cd backend
npm start
```

That starts:

- Backend API on `http://localhost:5001`
- Frontend on `http://localhost:5173`

The backend tries MongoDB Atlas first. If Atlas is unavailable on your machine, it falls back to the local datastore so localhost still works.

## Environment Variables

Use example values only. Replace them with your own values in Netlify, Render, Atlas, or local `.env` files.
The backend is Atlas-first, with a local fallback for localhost development.

Backend `.env` example:

```env
PORT=5001
CLIENT_URL=http://localhost:5173,http://127.0.0.1:5173
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.example.mongodb.net/?appName=Cluster0
MONGODB_DB=data_dashboard
JWT_SECRET=your_long_random_jwt_secret
JWT_EXPIRES_IN=1d
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
ADMIN_ROLE=Admin
SEED_DEMO_DATA=false
```

Frontend `.env` example:

```env
VITE_API_URL=http://127.0.0.1:5001/api
```

## Production Setup

In Render:

- Set the backend root directory to `backend`
- Set the start command to `npm start`
- Add the backend environment variables
- Point `MONGODB_URI` to your Atlas cluster

In Netlify:

- Set the frontend root directory to `frontend`
- Set the build command to `npm run build`
- Set the publish directory to `dist`
- Add `VITE_API_URL` with your backend API URL

After changing environment variables, redeploy the related service.

## API Routes

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Admin login |
| `GET` | `/api/auth/me` | Current admin profile |
| `GET` | `/api/dashboard` | Dashboard data |
| `GET` | `/api/users` | List users |
| `POST` | `/api/users` | Create user |
| `PUT` | `/api/users/:id` | Update user |
| `DELETE` | `/api/users/:id` | Delete user |

## Health Check

Replace `your-backend-service` with your actual backend host:

```text
https://your-backend-service.example.com/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "admin-dashboard-api"
}
```
