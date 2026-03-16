# System Design Document
## Internal Project Management System with Real-Time Collaboration

### 1. High-Level Architecture Diagram (ASCII)
```text
                                   JWT Auth Flow
  +-----------------------------------------------------------------------------------+
  | 1) Client sends credentials to /api/auth/login                                    |
  | 2) Server returns access JWT (15 min) + refresh token (7 days)                    |
  | 3) Client sends Bearer JWT on REST requests                                        |
  | 4) Client sends JWT in Socket.IO handshake auth                                    |
  +-----------------------------------------------------------------------------------+

                                      HTTPS / WSS
  +---------------------------+      REST + WebSocket       +-------------------------+
  | Client: React SPA         | --------------------------> | Nginx Reverse Proxy     |
  | - React Router            |                             | - TLS termination        |
  | - Zustand state           | <-------------------------- | - /api -> Express       |
  | - Axios/fetch             |   API responses + events    | - /socket.io -> Node    |
  | - Socket.IO client        |                             +-----------+-------------+
  +-------------+-------------+                                         |
                |                                                       |
                | Bearer JWT on /api/*                                  | Proxied HTTP traffic
                | JWT in socket handshake                               v
                |                                         +-------------+----------------------+
                |                                         | Node.js HTTP Server               |
                |                                         |                                    |
                |                                         |  +------------------------------+  |
                |                                         |  | Express REST API             |  |
                |                                         |  | - auth middleware            |  |
                |                                         |  | - project/task controllers   |  |
                |                                         |  | - service layer              |  |
                |                                         |  +--------------+---------------+  |
                |                                         |                 |                  |
                |                                         |                 | attached to same |
                |                                         |                 | HTTP server      |
                |                                         |  +--------------v---------------+  |
                +---------------------------------------> |  | Socket.IO Server             |  |
                   WebSocket / long-poll fallback         |  | - handshake JWT verification |  |
                                                          |  | - project rooms              |  |
                                                          |  | - presence + broadcasts      |  |
                                                          |  +--------------+---------------+  |
                                                          +-----------------+------------------+
                                                                            |                |
                                              CRUD queries / indexes        | Pub/Sub +      | Cache / presence
                                              read + write                  | cross-instance | metadata
                                                                            | broadcasts     |
                                                                            v                v
                                                                 +----------+---------------------+
                                                                 | Redis                            |
                                                                 | - Socket.IO adapter              |
                                                                 | - pub/sub between Node instances |
                                                                 | - presence/cache support         |
                                                                 +----------+---------------------+
                                                                            ^
                                                                            |
                                                          +-----------------+------------------+
                                                          | MongoDB Atlas                      |
                                                          | - users                            |
                                                          | - projects                         |
                                                          | - tasks                            |
                                                          | - activities                       |
                                                          | - primary persistent data store    |
                                                          +------------------------------------+
```

### 2. API Endpoint List
System roles in the codebase are `admin`, `project_manager`, and `member`.
Project membership roles are `manager` and `member`.

| Method | Endpoint | Purpose | Auth Required | Role |
|---|---|---|---|---|
| POST | `/api/auth/register` | Register new user | No | Public |
| POST | `/api/auth/login` | Login and return access JWT plus refresh token | No | Public |
| POST | `/api/auth/refresh` | Refresh access token using valid refresh token | No (refresh token required) | Public |
| POST | `/api/auth/logout` | Invalidate stored refresh token and end session | Yes (JWT) | Any authenticated user |
| GET | `/api/auth/me` | Get current authenticated user profile | Yes (JWT) | Any authenticated user |
| POST | `/api/projects` | Create project | Yes (JWT) | System role `admin` or `project_manager` |
| GET | `/api/projects` | List projects visible to current user | Yes (JWT) | Any authenticated user |
| GET | `/api/projects/:id` | Get project details including members | Yes (JWT) | Project owner, project member, or `admin` |
| PUT | `/api/projects/:id` | Update project metadata and visibility | Yes (JWT) | Project owner, `admin`, or project member with role `manager` |
| DELETE | `/api/projects/:id` | Delete project | Yes (JWT) | `admin`, or system role `project_manager` with project management access |
| POST | `/api/projects/:id/members` | Add member to project | Yes (JWT) | Project owner, `admin`, or project member with role `manager` |
| DELETE | `/api/projects/:id/members/:userId` | Remove member from project | Yes (JWT) | Project owner, `admin`, or project member with role `manager` |
| POST | `/api/projects/:projectId/tasks` | Create task in project | Yes (JWT) | Project owner, project member, or `admin` |
| GET | `/api/projects/:projectId/tasks` | List tasks in a project | Yes (JWT) | Project owner, project member, or `admin` |
| GET | `/api/projects/:projectId/tasks/:taskId` | Get task detail | Yes (JWT) | Project owner, project member, or `admin` |
| PUT | `/api/projects/:projectId/tasks/:taskId` | Update task title, description, priority, due date, assignee, or order | Yes (JWT) | Project owner, project member, or `admin` |
| DELETE | `/api/projects/:projectId/tasks/:taskId` | Delete task | Yes (JWT) | Project owner, `admin`, or project member with role `manager` |
| PATCH | `/api/projects/:projectId/tasks/:taskId/status` | Update task status and trigger real-time board event | Yes (JWT) | Project owner, project member, or `admin` |
| PATCH | `/api/projects/:projectId/tasks/:taskId/assign` | Assign or reassign task to member | Yes (JWT) | Project owner, `admin`, or project member with role `manager` |
| GET | `/api/projects/:projectId/activities` | Get project activity log | Yes (JWT) | Project owner, project member, or `admin` |

### 3. Database Schema (MongoDB Collections)

#### Users Collection
```js
{
  _id: ObjectId,
  name: String, // required
  email: String, // unique, required
  password: String, // hashed, required
  role: String, // enum: ["admin", "project_manager", "member"], default: "member"
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
```js
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ refreshToken: 1 }, { sparse: true });
db.users.createIndex({ createdAt: -1 });
```

#### Projects Collection
```js
{
  _id: ObjectId,
  name: String, // required
  description: String,
  owner: ObjectId, // ref: Users, required
  members: [
    {
      user: ObjectId, // ref: Users
      role: String // enum: ["manager", "member"]
    }
  ],
  status: String, // enum: ["active", "archived"], default: "active"
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
```js
db.projects.createIndex({ owner: 1, status: 1 });
db.projects.createIndex({ "members.user": 1, status: 1 });
db.projects.createIndex({ status: 1, createdAt: -1 });
db.projects.createIndex({ name: 1 });
```

#### Tasks Collection
```js
{
  _id: ObjectId,
  title: String, // required
  description: String,
  project: ObjectId, // ref: Projects, required
  assignee: ObjectId, // ref: Users
  status: String, // enum: ["todo", "in_progress", "in_review", "done"], default: "todo"
  priority: String, // enum: ["low", "medium", "high", "critical"], default: "medium"
  dueDate: Date,
  order: Number,
  createdBy: ObjectId, // ref: Users
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:
```js
db.tasks.createIndex({ project: 1, status: 1, order: 1 });
db.tasks.createIndex({ project: 1, assignee: 1 });
db.tasks.createIndex({ assignee: 1, dueDate: 1 });
db.tasks.createIndex({ project: 1, priority: 1, dueDate: 1 });
db.tasks.createIndex({ createdAt: -1 });
db.tasks.createIndex({ title: "text", description: "text" });
```

#### Activities Collection
```js
{
  _id: ObjectId,
  project: ObjectId, // ref: Projects, required
  task: ObjectId, // ref: Tasks
  user: ObjectId, // ref: Users, required
  action: String, // enum: ["created", "updated", "deleted", "status_changed", "assigned", "commented"]
  details: {
    field: String,
    oldValue: Mixed,
    newValue: Mixed
  },
  createdAt: Date
}
```

Indexes:
```js
db.activities.createIndex({ project: 1, createdAt: -1 });
db.activities.createIndex({ task: 1, createdAt: -1 });
db.activities.createIndex({ user: 1, createdAt: -1 });
db.activities.createIndex({ action: 1, createdAt: -1 });
```

### 4. Real-Time Communication Strategy
The application uses Socket.IO attached to the same Node.js HTTP server that serves the Express REST API. This keeps API and real-time transport under one deployment unit, simplifies authentication, and allows task mutations handled by REST controllers to emit socket events immediately after persistence succeeds.

Redis is used as the Socket.IO adapter so multiple Node.js instances can behave as one logical real-time cluster. When one instance emits a project event, Redis publishes it and all subscribed instances forward the event to sockets connected on their process. Redis can also store lightweight presence metadata such as active socket IDs or online user sets.

Socket authentication is handled during the handshake. After a user logs in via REST, the client includes the access JWT in `socket.auth.token` when connecting. A Socket.IO middleware verifies the token, resolves the user identity, and rejects the connection during the handshake if the token is invalid or expired.

The room model is project-centric. Each project maps to a room named `project:{projectId}`. When a user opens a project board, the client emits `join:project` with the project ID. The server verifies that the user has access to the project, joins the socket to the room, and can optionally broadcast presence updates to other room members. When the user navigates away, closes the board, or disconnects, the socket leaves the room and the server updates presence state.

Task lifecycle events originate from REST mutations:
- `POST /tasks` persists the task in MongoDB, writes an activity record, then emits `task:created` to `project:{projectId}`.
- `PUT /tasks/:taskId` emits `task:updated` after a successful update.
- `PATCH /tasks/:taskId/status` emits `task:status_changed` with old and new status values so all clients can update their Kanban columns instantly.
- `DELETE /tasks/:taskId` emits `task:deleted`.
- `PATCH /tasks/:taskId/assign` emits `task:assigned`.

Presence events are driven by socket joins and disconnects. A user can have multiple active tabs, so the system should track user-to-socket mappings and only emit `user:offline` when the final active socket for that user disconnects.

#### Socket Events Table
| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `connection` | Client→Server | JWT in handshake auth | Initial connection |
| `join:project` | Client→Server | `{ projectId }` | Join project room |
| `leave:project` | Client→Server | `{ projectId }` | Leave project room |
| `task:created` | Server→Room | `{ task }` | New task added |
| `task:updated` | Server→Room | `{ task }` | Task details changed |
| `task:status_changed` | Server→Room | `{ taskId, oldStatus, newStatus, updatedBy }` | Task moved on board |
| `task:deleted` | Server→Room | `{ taskId }` | Task removed |
| `task:assigned` | Server→Room | `{ taskId, assignee }` | Task assigned |
| `member:joined` | Server→Room | `{ user }` | New member added |
| `member:left` | Server→Room | `{ userId }` | Member removed |
| `user:online` | Server→Room | `{ id, name, email, role }` | Presence indicator |
| `user:offline` | Server→Room | `{ id, name, email, role }` | Presence indicator |
| `error` | Server→Client | `{ message }` | Error notification |

### 5. Why This Approach Was Chosen
- **Socket.IO over raw WebSockets**
  - Chosen because it provides automatic reconnection, fallback transport support, event-based messaging, and built-in room mechanics that fit project-scoped collaboration naturally.
  - Trade-off: Socket.IO adds protocol overhead and a library dependency, but the development speed and reliability features outweigh the extra abstraction for this app.

- **Redis adapter**
  - Chosen because it allows multiple Node.js instances to share room events through pub/sub, which is essential once the application runs behind a load balancer.
  - Trade-off: Redis introduces another infrastructure component to operate, but it removes the single-instance bottleneck for real-time delivery.

- **MongoDB over PostgreSQL**
  - Chosen because the data model is document-centric, task metadata may evolve, activity `details` can vary by action, and MongoDB works naturally with JSON-style objects in Node.js.
  - Trade-off: PostgreSQL offers stronger relational guarantees and more advanced joins, but MongoDB reduces impedance mismatch and keeps iteration faster for this internal product.

- **JWT over server-side sessions**
  - Chosen because JWT-based auth is stateless for the API tier, works cleanly with Socket.IO handshake verification, and avoids centralized session storage for every request.
  - Trade-off: Token revocation is less immediate than server-stored sessions, so refresh-token invalidation and short-lived access tokens are used to reduce risk.

- **Zustand over Redux**
  - Chosen because it is lighter, simpler to wire into a React SPA, and sufficient for managing auth state, current project state, board filters, and live task updates without Redux boilerplate.
  - Trade-off: Redux has richer ecosystem tooling and stricter architectural conventions, but those benefits are not necessary for the current scope and team size.

- **Service-layer pattern**
  - Chosen because it separates controllers, business rules, persistence, and socket emission logic. This improves testability, keeps controllers thin, and allows reuse across REST and background workflows.
  - Trade-off: It adds an extra abstraction layer, but the codebase stays easier to maintain as project and task logic grows.

### 6. Scalability Considerations
- **Horizontal scaling for real-time traffic**
  - The Redis adapter allows several Node.js instances to run behind Nginx or a future load balancer while still broadcasting socket events across all connected clients.
  - Sticky sessions are recommended when long-polling fallback is enabled, even though WebSocket traffic can remain stable after upgrade.

- **MongoDB query performance**
  - Indexes are defined on frequently queried fields such as `project`, `status`, `assignee`, and activity timestamps.
  - Board views should query tasks by `project + status + order` to avoid full collection scans.

- **MongoDB connection pooling**
  - Use the MongoDB driver's built-in connection pool and size it for expected concurrent API and socket-driven workloads.
  - Reuse a singleton database client per Node.js process rather than opening per-request connections.

- **Rate limiting**
  - Apply rate limiting to authentication endpoints such as login, register, and refresh to reduce brute-force and token abuse risk.
  - A Redis-backed rate limiter is preferred in multi-instance deployments so limits are enforced consistently.

- **Socket connection limit management**
  - Enforce per-user connection caps or idle socket cleanup to prevent excessive tab abuse and unnecessary memory usage.
  - Tune heartbeat and disconnect timeouts so presence remains accurate without creating premature disconnect churn.

- **Future async workload offloading**
  - Heavy non-blocking work such as report generation, audit exports, or bulk project imports should move to a job queue such as Bull or BullMQ.
  - This keeps API latency predictable and prevents socket event delivery from being delayed by long-running tasks.

- **Future database sharding strategy**
  - If data volume grows significantly, shard high-write collections such as `tasks` and `activities` using a shard key derived from `project` so writes distribute more evenly.
  - Projects with very large task volume can then scale horizontally while preserving locality for project-scoped queries.
