# Admin Dashboard

A full-stack admin dashboard with a React frontend, Express backend, JWT authentication, dashboard analytics, and user management.

## Live Demo

[Open Admin Dashboard](https://admin-dashboard110.netlify.app/)

## Deployment

| Layer | Platform |
| --- | --- |
| Frontend | Netlify |
| Backend API | Render |
| Database | MongoDB Atlas |

## Tech Stack

- React + Vite
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Axios
- Lucide React icons

## Project Structure

```text
frontend/   React dashboard UI
backend/    Express REST API
```

## Run Locally

Start the backend:

```bash
cd backend
npm install
npm run dev
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

Backend runs at:

```text
http://localhost:5001
```

## Environment Variables

Use example values only. Replace them with your own values in Netlify, Render, or local `.env` files.

Backend `.env` example:

```env
PORT=5001
CLIENT_URL=https://your-netlify-site.netlify.app
MONGODB_URI=mongodb+srv://username:password@cluster.example.mongodb.net/database_name
MONGODB_DB=database_name
JWT_SECRET=your_long_random_jwt_secret
JWT_EXPIRES_IN=1d
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your_admin_password
ADMIN_ROLE=Admin
SEED_DEMO_DATA=false
CLEAR_DEMO_DATA=true
```

Frontend `.env` example:

```env
VITE_API_URL=https://your-render-service.onrender.com/api
```

## Production Setup

In Render:

- Set the backend root directory to `backend`
- Set the start command to `npm start`
- Add the backend environment variables
- Use MongoDB Atlas for `MONGODB_URI`

In Netlify:

- Set the frontend root directory to `frontend`
- Set the build command to `npm run build`
- Set the publish directory to `dist`
- Add `VITE_API_URL` with your Render API URL

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

```text
https://your-render-service.onrender.com/api/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "digital-mongers-api"
}
```
