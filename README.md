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

System roles in this codebase are `admin`, `project_manager`, and `member`.
Project membership roles are `manager` and `member`.

| Method | Endpoint | Description | Auth Required | Role Required |
|---|---|---|---|---|
| **POST** | `/api/auth/register` | Register a new user | No | - |
| **POST** | `/api/auth/login` | Authenticate and get JWT | No | - |
| **POST** | `/api/auth/refresh` | Rotate access and refresh tokens | No | - |
| **POST** | `/api/auth/logout` | Terminate the active session | Yes | Authenticated user |
| **GET**  | `/api/auth/me` | Fetch the active user profile | Yes | Authenticated user |
| **POST** | `/api/projects` | Create a new project | Yes | System role `admin` or `project_manager` |
| **GET**  | `/api/projects` | List projects visible to the current user | Yes | Any authenticated user |
| **GET**  | `/api/projects/:id` | Get details for one project | Yes | Project owner, member, or `admin` |
| **PUT**  | `/api/projects/:id` | Update project details | Yes | Project owner, `admin`, or member with project role `manager` |
| **DELETE**|`/api/projects/:id` | Delete a project and cascade tasks and activities | Yes | `admin`, or system role `project_manager` with project management access |
| **POST** | `/api/projects/:id/members`| Add a member by email | Yes | Project owner, `admin`, or member with project role `manager` |
| **DELETE**|`/api/projects/:id/members/:userId`| Remove a member | Yes | Project owner, `admin`, or member with project role `manager` |
| **POST** | `/api/projects/:projectId/tasks`| Create a new task | Yes | Project owner, member, or `admin` |
| **GET**  | `/api/projects/:projectId/tasks`| List and filter tasks | Yes | Project owner, member, or `admin` |
| **GET**  | `/api/projects/:projectId/tasks/:taskId`| Get task details | Yes | Project owner, member, or `admin` |
| **PUT**  | `/api/projects/:projectId/tasks/:taskId`| Update editable task fields | Yes | Project owner, member, or `admin` |
| **DELETE**|`/api/projects/:projectId/tasks/:taskId`| Delete a task | Yes | Project owner, `admin`, or member with project role `manager` |
| **PATCH**| `/api/projects/:projectId/tasks/:taskId/status`| Update task status and board order | Yes | Project owner, member, or `admin` |
| **PATCH**| `/api/projects/:projectId/tasks/:taskId/assign`| Assign or unassign a task | Yes | Project owner, `admin`, or member with project role `manager` |
| **GET**  | `/api/projects/:projectId/activities`| Get project activity history | Yes | Project owner, member, or `admin` |

---

## Socket Events Documentation

Project-specific broadcasts are emitted to the room `project:{projectId}`.

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `join:project` | Client → Server | `{ projectId }` | Emitted by the client when entering a project view. |
| `leave:project` | Client → Server | `{ projectId }` | Emitted by the client when leaving a project view. |
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
# Copy .env.example to .env, then edit the values for your environment
# Example:
#   PowerShell: Copy-Item .env.example .env
#   Bash:       cp .env.example .env
# E.g. MONGODB_URI=mongodb://localhost:27017/project-mgmt

npm install
npm run dev
```
*(The API will start on `http://localhost:5000`)*

### 3. Frontend Setup
Open a new terminal window:
```bash
cd client
# Copy .env.example to .env, then edit the values for your environment
# Example:
#   PowerShell: Copy-Item .env.example .env
#   Bash:       cp .env.example .env
#
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

This repository includes deployment assets for both a managed-service setup and a VM-based setup.

### Option A: Managed deployment used by the checked-in config

#### Backend (Render)
1. Push the repository to GitHub.
2. Create a Render web service manually, or apply the included `render.yaml` blueprint.
3. Use the backend commands from the repo config:
   - Build: `cd server && npm install`
   - Start: `cd server && node server.js`
4. Provide the backend environment variables from `server/.env.example`.
5. Set `CLIENT_URL` to the final frontend origin.
6. Provision Redis through Render Key Value, Redis Cloud, or another managed Redis service.
7. Use MongoDB Atlas for `MONGODB_URI` and keep it private.

#### Frontend (Vercel)
1. Create a Vercel project from the same GitHub repository.
2. Set the Root Directory to `client`.
3. Use the Vite defaults:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Set `VITE_API_URL` and `VITE_SOCKET_URL` to the deployed backend base URL.
5. Create a Vercel deploy hook and store it in GitHub Actions as `VERCEL_DEPLOY_HOOK_URL` if you want CI-triggered production redeploys.
6. Deploy the site.

#### CI/CD
1. GitHub Actions is defined in `.github/workflows/ci.yml`.
2. The pipeline runs backend and frontend lint/build checks.
3. On pushes to `main`, it triggers the Render deploy hook and the Vercel deploy hook.

### Option B: VM deployment with Nginx and SSL
1. Provision a Linux VM and install Node.js 18+, Nginx, and a process manager such as PM2.
2. Run the backend on `127.0.0.1:5000`.
3. Copy `deploy/nginx/projectflow.conf` to your Nginx sites configuration and replace `api.projectflow.example.com` with your real domain or subdomain.
4. Issue a Let's Encrypt certificate for that domain and update the certificate paths if needed.
5. Point DNS to the VM, reload Nginx, and verify both `/api` and `/socket.io/` are proxied correctly.
6. Keep MongoDB and Redis credentials in server-side environment variables only.

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

*   **Frontend**: Pending deployment for this workspace
*   **Backend API**: Pending deployment for this workspace
*   **Health Check**: Pending deployment for this workspace (`/health`)
*   **API Docs**: No separate Swagger/Postman URL is published in this repository; use the API table above

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
