---
title: "Admin Dashboard - Technical Overview"
author: "Admin Dashboard"
date: "May 10, 2026"
---

# Admin Dashboard - Technical Overview

## 1. Project Summary

Admin Dashboard is a full stack web application for managing analytics, reports, and users.

- Frontend is built with React and Vite.
- Backend is built with Node.js and Express.
- MongoDB stores admin, dashboard, report, and user data.
- JWT authentication protects private API routes.
- Charts are custom-built with SVG and CSS.

## 2. Folder Structure

```text
Admin Dashboard/
  backend/       Express API, MongoDB models, auth, routes
  frontend/      React UI, styles, API service, favicon
  docs/          Technical documentation and PDF
  README.md      Setup and run instructions
  .gitignore     Git ignore rules
```

## 3. Frontend Stack

- React 19: Builds the dashboard interface with reusable components.
- Vite 6: Runs the local development server and production build.
- Axios: Sends API requests from frontend to backend.
- Lucide React: Provides icons for navigation and actions.
- CSS: Handles layout, responsiveness, forms, tables, cards, and charts.
- SVG favicon: Provides the browser tab icon.

## 4. Backend Stack

- Node.js: JavaScript runtime for backend code.
- Express: REST API server and routing framework.
- MongoDB: Database used for persistent storage.
- Mongoose: Defines schemas and communicates with MongoDB.
- JSON Web Token: Handles token-based authentication.
- Zod: Validates request data for auth and user APIs.
- dotenv: Loads backend environment variables.
- cors: Allows frontend-backend communication during development.

## 5. Database Collections

- admins: Stores the admin login account.
- dashboards: Stores cards, chart data, reports, devices, and countries.
- users: Stores user management records.

## 6. API Type

The backend uses REST APIs.

- Request format: JSON.
- Response format: JSON.
- Protected APIs require a JWT token.
- Token is sent in the Authorization header.

```http
Authorization: Bearer <token>
```

## 7. API Endpoints

### Public APIs

- GET `/api/health`: Checks backend service status.
- POST `/api/auth/login`: Logs in the admin and returns a JWT token.

### Protected Auth APIs

- GET `/api/auth/me`: Returns the logged-in admin profile.

### Protected Dashboard APIs

- GET `/api/dashboard`: Returns dashboard cards, charts, reports, devices, and countries.
- POST `/api/dashboard/reports`: Creates a report and updates dashboard chart data.

### Protected User APIs

- GET `/api/users?search=&page=1&limit=5`: Lists users with search and pagination.
- POST `/api/users`: Creates a new user.
- PUT `/api/users/:id`: Updates an existing user.
- DELETE `/api/users/:id`: Deletes a user.

## 8. Authentication Flow

1. Admin enters email and password on the login screen.
2. Backend validates request data with Zod.
3. Backend checks the admin record in MongoDB.
4. Backend creates and returns a JWT token.
5. Frontend stores the token in local storage.
6. Axios sends the token with protected API requests.
7. Backend middleware verifies the token before returning private data.

## 9. Charts Used

The app does not use Chart.js, Recharts, ApexCharts, or another chart library.

- Revenue chart: Custom SVG line chart using `polyline` and `polygon`.
- Expenses chart: Custom SVG line chart using `polyline` and `polygon`.
- Profit chart: CSS bar chart using repeated elements.
- Sessions chart: Custom SVG sparkline using `polyline`.
- Device chart: CSS gauge using `conic-gradient`.
- Country chart: CSS progress bars using dynamic widths.

This keeps the frontend lightweight and avoids extra chart dependencies.

## 10. Dashboard Behavior

- Fresh dashboard starts with zero data.
- Empty charts show readable empty states.
- Creating a report updates cards, charts, report rows, devices, and countries.
- Export buttons download CSV files.
- Users page supports add, edit, delete, search, and pagination.

## 11. Environment Configuration

Backend `.env` includes:

- PORT: Backend server port.
- CLIENT_URL: Frontend URL allowed by CORS.
- MONGODB_URI: MongoDB connection string.
- MONGODB_DB: MongoDB database name.
- JWT_SECRET: Secret key for JWT signing.
- JWT_EXPIRES_IN: JWT expiration time.
- ADMIN_NAME: Admin display name.
- ADMIN_EMAIL: Admin login email.
- ADMIN_PASSWORD: Admin login password.
- ADMIN_ROLE: Admin role.
- SEED_DEMO_DATA: Enables optional starter data.
- CLEAR_DEMO_DATA: Clears old demo data when enabled.

Frontend `.env` includes:

- VITE_API_URL: Backend API base URL.

## 12. Run Commands

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

