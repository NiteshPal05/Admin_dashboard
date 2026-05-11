# Admin Dashboard

Full stack admin dashboard built with a separate Vite React frontend and Node.js backend.

## Structure

```text
frontend/   Vite + React dashboard UI
backend/    Express REST API with JWT auth
```

## Demo Login

```text
Email: admin@digitalmongers.com
Password: Admin@123
```

You can change the admin login from `backend/.env`:

```env
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@digitalmongers.com
ADMIN_PASSWORD=Admin@123
ADMIN_ROLE=Admin
```

Restart the backend after changing these values. The app syncs the admin account from env on startup.

## Run Locally

Install and start the backend:

```bash
cd backend
npm install
npm run dev
```

Install and start the frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment Files

Backend: `backend/.env`

```env
PORT=5001
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/data_dashboard
MONGODB_DB=data_dashboard
JWT_SECRET=local-dashboard-secret
JWT_EXPIRES_IN=1d
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@digitalmongers.com
ADMIN_PASSWORD=Admin@123
ADMIN_ROLE=Admin
SEED_DEMO_DATA=false
CLEAR_DEMO_DATA=true
```

Frontend: `frontend/.env`

```env
VITE_API_URL=http://localhost:5001/api
```

## Deploy on Render + Netlify

Render backend environment variables:

```env
CLIENT_URL=https://your-netlify-site.netlify.app
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB=data_dashboard
JWT_SECRET=use_a_long_random_secret
JWT_EXPIRES_IN=1d
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@digitalmongers.com
ADMIN_PASSWORD=Admin@123
ADMIN_ROLE=Admin
SEED_DEMO_DATA=false
CLEAR_DEMO_DATA=true
```

If you have more than one frontend URL, separate them with commas:

```env
CLIENT_URL=https://your-netlify-site.netlify.app,https://your-custom-domain.com
```

Netlify frontend environment variables:

```env
VITE_API_URL=https://your-render-service.onrender.com/api
```

After changing `VITE_API_URL` in Netlify, redeploy the frontend. After changing `CLIENT_URL` or admin credentials in Render, restart or redeploy the backend.

For login, use the same `ADMIN_EMAIL` and `ADMIN_PASSWORD` values configured on Render. The backend updates the admin account from those environment variables each time it starts.

Quick production checks:

```bash
curl https://your-render-service.onrender.com/api/health
```

The response should include `"status":"ok"`. If login still fails, open the browser Network tab and check the `/api/auth/login` request:

| Symptom | Fix |
| --- | --- |
| Request goes to `localhost:5001` | Set `VITE_API_URL` in Netlify to the Render API URL and redeploy. |
| CORS error | Set Render `CLIENT_URL` to the exact Netlify URL, including `https://`. |
| `Invalid credentials` | Use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` configured on Render, then restart Render. |
| Backend health URL fails | Check Render logs and MongoDB Atlas network/database credentials. |

## API

All protected endpoints require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard` | Dashboard cards, charts, orders, country data |
| GET | `/api/users?search=&page=1&limit=5` | List users |
| POST | `/api/users` | Add user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

## Notes

The backend uses port `5001`. MongoDB is required. By default the API creates the admin account, resets dashboard analytics to a clean zero-data state, and removes the old demo users. Set `SEED_DEMO_DATA=true` if you want starter users again.

## Database

Use a local MongoDB instance or MongoDB Atlas. For local MongoDB, keep:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/data_dashboard
```

Collections created by the app:

| Collection | Purpose |
| --- | --- |
| `admins` | Login account |
| `dashboards` | Analytics/cards/orders/country data |
| `users` | User management CRUD |
