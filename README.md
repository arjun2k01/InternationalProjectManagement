# ProjectFlow — Internal Project Management System

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-18.x-blue?style=flat-square&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green?style=flat-square&logo=mongodb)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?style=flat-square&logo=socket.io)
![Redis](https://img.shields.io/badge/Redis-7.x-red?style=flat-square&logo=redis)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

ProjectFlow is a real-time, highly interactive internal project management system. It provides teams with a unified workspace to manage projects, collaborate on tasks using Kanban-style boards, track activities, and see live updates when colleagues make changes.

---

## Architecture Overview

ProjectFlow is built on a modern full-stack JavaScript architecture. The React frontend communicates with a robust Express backend via REST APIs for standard CRUD operations and WebSocket (Socket.IO) connections for real-time reactivity. Redis handles horizontal scaling for WebSockets via pub/sub, ensuring real-time events propagate across multiple server instances.

```text
                     +-------------------+
                     |                   |
                     |   Client (React)  |
                     |                   |
                     +---------+---------+
                               |
                   REST API    |    WebSocket
                 (HTTPS/JSON)  |  (Socket.IO)
                               v
                     +-------------------+
                     |                   |
                     |   Nginx / Proxy   |
                     |                   |
                     +---------+---------+
                               |
                               v
                     +-------------------+
                     |                   |
                     | Express API (Node)| <======> Redis (Socket.IO Adapter / Pub-Sub)
                     |                   |
                     +---------+---------+
                               |
                               v
                     +-------------------+
                     |                   |
                     |      MongoDB      |
                     |                   |
                     +-------------------+
```

### Technology Stack

| Technology       | Version | Purpose |
|------------------|---------|---------|
| **Node.js**      | >= 18.x | JavaScript runtime for the backend server |
| **Express**      | 4.x     | Backend web framework and API routing |
| **MongoDB**      | 6.x     | Primary NoSQL document database |
| **Mongoose**     | 8.x     | ODM for MongoDB schema modeling |
| **Socket.IO**    | 4.7.x   | Real-time bi-directional event communication |
| **Redis**        | 7.x     | Socket.IO adapter for horizontal scaling |
| **React**        | 18.2.x  | Frontend UI library |
| **Zustand**      | 4.5.x   | Client-side global state management |
| **React Router** | 6.22.x  | Client-side routing and navigation |
| **Tailwind CSS** | 3.4.x   | Utility-first CSS framework for styling |
| **Vite**         | 5.2.x   | Fast frontend build tool and dev server |

---

## Design Decisions & Trade-offs

#### 1. Why Socket.IO over raw WebSockets
Socket.IO provides critical abstractions out of the box that raw WebSockets lack. It includes automatic HTTP long-polling fallback for constrained networks, robust automatic reconnection logic with exponential backoff, native support for "rooms" (essential for project-specific event broadcasting), and a seamless Redis adapter for scaling across multiple Node.js instances.

#### 2. Why Redis adapter
Without Redis, Socket.IO clients connected to different backend instances (e.g., behind a load balancer) cannot communicate. The `@socket.io/redis-adapter` uses Redis Pub/Sub to instantly route messages between server instances, ensuring horizontal scaling is entirely transparent.

#### 3. Why MongoDB
Project management data is inherently hierarchical and schema-flexible (e.g., projects containing tasks, dynamic activity logs). MongoDB's document model maps perfectly to these JSON-like structures. Its powerful aggregation pipeline allows for complex querying (e.g., fetching member stats) seamlessly.

#### 4. Why Zustand over Redux/Context
Zustand provides a localized, un-opinionated state management solution without the immense boilerplate of Redux or the performance pitfalls (unnecessary re-renders) of native React Context. It keeps the frontend lightweight and straightforward to maintain.

#### 5. Why the Service-Layer Pattern
The backend strictly separates routes, controllers, and services. Controllers are "thin" and only handle HTTP req/res mapping. All business logic lives in the Service layer. This makes the code intrinsically testable, highly reusable (services can call other services, like `recordActivity`), and easier to maintain.

#### Trade-offs Acknowledged
*   **MongoDB Eventual Consistency**: Complex multi-document transactions are harder to enforce out-of-the-box compared to a relational standard like PostgreSQL. We mitigate this using cascading deletes in the application layer or Mongoose middleware.
*   **JWT Revocation**: Stateless JWTs cannot be revoked instantly without a database lookup. We trade pure statelessness for security by persisting hashed refresh tokens in the database, allowing us to invalidate sessions upon logout or credential changes.

---

## API Documentation

| Method | Endpoint | Description | Auth Required | Role Required |
|---|---|---|---|---|
| **POST** | `/api/auth/register` | Register a new user | No | - |
| **POST** | `/api/auth/login` | Authenticate and get JWT | No | - |
| **POST** | `/api/auth/refresh` | Rotate access & refresh tokens | Yes | - |
| **POST** | `/api/auth/logout` | Terminate active session | Yes | - |
| **GET**  | `/api/auth/me` | Fetch active user profile | Yes | - |
| **POST** | `/api/projects` | Create a new project | Yes | Admin, Manager |
| **GET**  | `/api/projects` | List projects for the user | Yes | - |
| **GET**  | `/api/projects/:id` | Get details for a project | Yes | Member |
| **PUT**  | `/api/projects/:id` | Update project details | Yes | Admin, Manager |
| **DELETE**|`/api/projects/:id` | Delete project and cascade data | Yes | Admin |
| **POST** | `/api/projects/:id/members`| Add a new member via email | Yes | Admin, Manager |
| **DELETE**|`/api/projects/:id/members/:userId`| Remove a member | Yes | Admin, Manager |
| **POST** | `/api/projects/:projectId/tasks`| Create a new task | Yes | Member |
| **GET**  | `/api/projects/:projectId/tasks`| List and filter tasks | Yes | Member |
| **GET**  | `/api/projects/:projectId/tasks/:taskId`| Get task details | Yes | Member |
| **PUT**  | `/api/projects/:projectId/tasks/:taskId`| Update task details | Yes | Member |
| **DELETE**|`/api/projects/:projectId/tasks/:taskId`| Delete a task | Yes | Manager |
| **PATCH**| `/api/projects/:projectId/tasks/:taskId/status`| Update status/column order | Yes | Member |
| **PATCH**| `/api/projects/:projectId/tasks/:taskId/assign`| Assign the task to a user | Yes | Member |
| **GET**  | `/api/projects/:projectId/activities`| Poll paginated activity logs| Yes | Member |

---

## Socket Events Documentation

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `project:join` | Client → Server | `{ projectId }` | Emitted by client on mount to join the room. |
| `project:leave` | Client → Server | `{ projectId }` | Emitted by client on unmount. |
| `task:created` | Server → Client | `{ task }` | Emitted when a new task is created. |
| `task:updated` | Server → Client | `{ task }` | Emitted on full task updates (titles, dates). |
| `task:status_changed`| Server → Client | `{ taskId, oldStatus, newStatus, updatedBy }` | Emitted on column drag-and-drops. |
| `task:deleted` | Server → Client | `{ taskId }` | Emitted when a task is removed. |
| `task:assigned`| Server → Client | `{ taskId, assignee }` | Emitted when assignment changes. |
| `member:joined`| Server → Client | `{ user }` | Emitted when someone is invited to the project. |
| `member:left`  | Server → Client | `{ userId }` | Emitted when a member is removed. |
| `user:online`  | Server → Client | `{ user }` | Emitted when a project member connects. |
| `user:offline` | Server → Client | `{ user }` | Emitted when a project member disconnects. |
| `error` | Server → Client | `{ message }` | Standardized websocket error notification. |

---

## Database Schema

Brief overview of the main Mongoose collections:

*   **Users (`User`)**: Stores `name`, `email`, hashed `password`, system `role` (admin, project_manager, member), and the hashed `refreshToken` for secure session management.
*   **Projects (`Project`)**: Stores `name`, `description`, `owner` (ObjectId ref), organizational `status`, and a `members` array embedding references and project-specific roles.
*   **Tasks (`Task`)**: Core objects holding `title`, `description`, `project` linkage, `assignee`, Kanban `status` (todo, in_progress, etc.), `priority`, `dueDate`, `order` (for drag sorting), and `createdBy`.
*   **Activities (`Activity`)**: Read-only ledger capturing dynamic operations. Stores `project`, `user`, `task` ref, exact `action` enum (e.g., status_changed), and flexible `details` mapping `oldValue` & `newValue`.

---

## Local Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) >= 18.x
- [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas cluster URL)
- [Redis](https://redis.io/) (Local installation, Docker container, or Redis Cloud)

### 1. Clone the repository
```bash
git clone <repo-url>
cd project-mgmt
```

### 2. Backend Setup
```bash
cd server
cp .env.example .env

# Edit the .env file with your local MongoDB and Redis URIs securely
# E.g. MONGODB_URI=mongodb://localhost:27017/projectflow

npm install
npm run dev
```
*(The API will start on `http://localhost:5000`)*

### 3. Frontend Setup
Open a new terminal window:
```bash
cd client
cp .env.example .env

# Edit .env with your backend target
# VITE_API_URL=http://localhost:5000
# VITE_SOCKET_URL=http://localhost:5000

npm install
npm run dev
```

### 4. Access the App
Open your browser and navigate to **[http://localhost:3000](http://localhost:3000)**.

---

## Environment Variables

| Variable | Description | Example | Required |
|---|---|---|---|
| **Server (`/server/.env`)** |
| `NODE_ENV` | Environment context | `development` | Yes |
| `PORT` | API Port | `5000` | Yes |
| `MONGODB_URI` | Standard Mongo Connection String | `mongodb://localhost:27017/db`| Yes |
| `REDIS_URL` | Redis instance for Socket adapter | `redis://localhost:6379` | Yes |
| `CLIENT_URL` | CORS whitelists | `http://localhost:3000` | Yes |
| `JWT_SECRET` | Secret key for access tokens | `your_secret_hash` | Yes |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | `your_refresh_hash` | Yes |
| `JWT_EXPIRY` | Short lifespan | `15m` | Yes |
| `JWT_REFRESH_EXPIRY` | Long lifespan | `7d` | Yes |
| **Client (`/client/.env`)** |
| `VITE_API_URL` | URL of deployed backend Express | `http://localhost:5000` | Yes |
| `VITE_SOCKET_URL` | Socket.IO server destination | `http://localhost:5000`| Yes |

---

## Deployment Steps

### Backend Deployment (Render)
1. Push your code to a GitHub repository.
2. Ensure your **MongoDB Atlas** cluster and **Redis Cloud** (or Render Redis) are active. Whitelist IPs (allow access from anywhere `0.0.0.0/0` if necessary for Render).
3. In Render, create a new **Web Service**. Connect your GitHub repository.
4. Set the Root Directory to `server`.
5. Build Command: `npm install`
6. Start Command: `npm start`
7. In the completely secure Render Environment Variables tab, paste all backend `.env` keys.
   *(Make sure `CLIENT_URL` points to your future frontend deployment URL)*.

### Frontend Deployment (Vercel / Netlify)
1. In Vercel, create a **New Project** and import the same repository.
2. Set the Root Directory to `client`.
3. The framework preset should auto-detect **Vite**.
4. Add the Environment Variables:
   * `VITE_API_URL` -> URL of your Render backend.
   * `VITE_SOCKET_URL` -> URL of your Render backend.
5. Click **Deploy**.

---

## Branching Strategy

ProjectFlow uses a simple release flow so CI, staging, and production stay predictable:

- `main` maps to production and auto-deploys after a successful CI run and merge.
- `develop` is the staging and integration branch where completed features are combined and validated together.
- `feature/*` branches are used for individual work items and should open pull requests into `develop`.
- `hotfix/*` branches are reserved for urgent production fixes and can open pull requests directly into `main`.
- All pull requests must pass CI before they are merged.

Recommended flow:

1. Create a branch from `develop` for normal work: `feature/task-board-realtime`.
2. Open a pull request into `develop` once local work is ready.
3. Merge `develop` into `main` when the release candidate is stable.
4. Use `hotfix/*` only when production needs an immediate correction.

---

## URLs

*   **Frontend**: `[Insert Frontend Vercel/Netlify URL]`
*   **Backend API**: `[Insert Backend Render URL]`
*   **API Docs**: `[Insert Postman/Swagger Link if applicable]`

---

## Folder Structure

<details>
<summary><b>Backend (`/server`)</b></summary>

```
server/
├── src/
│   ├── config/       # Environment & setups
│   ├── controllers/  # Request handlers
│   ├── middleware/   # Auth, roles, error handlers
│   ├── models/       # Mongoose schemas
│   ├── routes/       # Express router definitions
│   ├── services/     # Core business logic
│   ├── sockets/      # Socket.IO event handlers
│   ├── utils/        # Loggers, error classes
│   └── app.js        # Express app initialization
├── package.json
└── server.js         # Entry point (http & socket mount)
```
</details>

<details>
<summary><b>Frontend (`/client`)</b></summary>

```
client/
├── src/
│   ├── components/   # Reusable UI parts
│   │   ├── auth/
│   │   ├── common/
│   │   ├── layout/
│   │   ├── projects/
│   │   └── tasks/
│   ├── hooks/        # Custom React hooks (useSocket)
│   ├── pages/        # Route wrappers
│   ├── services/     # Axios configs & abstractions
│   ├── store/        # Zustand global state
│   ├── utils/        # Constants and helpers
│   ├── App.jsx       # Main routing logic
│   └── main.jsx      # Vite React mount
├── package.json
└── vite.config.js
```
</details>

---

## AI Usage Declaration

AI tools (Claude, ChatGPT, GitHub Copilot) were used for code generation, debugging, and documentation. All generated code was reviewed, understood, and modified as needed. The developer can explain every line of the codebase.

---

## License

This project is licensed under the MIT License.
# InternationalProjectManagement
