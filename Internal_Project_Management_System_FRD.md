# Functional Requirements Document (FRD)
## Internal Project Management System with Real-Time Collaboration

### 1. Project Overview
The Internal Project Management System is a web-based tool for a growing company to plan, manage, and track projects and tasks in a centralized environment. The system will support multiple teams working simultaneously, with shared visibility into project progress and task ownership.

A primary requirement is real-time collaboration. When multiple users are connected to the same project, task changes must appear instantly without requiring manual refresh. For example, if User A moves a task from `Todo` to `In Progress`, User B should see that update immediately, and User C, when opening the project later, should see the latest saved state.

The system will be designed as a single-tenant internal application using a MERN-based architecture, with secure authentication, role-based access, and synchronized task board updates across concurrent users.

### 2. Core Features
- **User Authentication**
  - Register new users
  - Login and logout
  - JWT-based session handling
  - Refresh token support for session renewal
  - Protected access to authenticated routes and APIs

- **Project Management**
  - Create, read, update, and delete projects
  - Invite members to projects
  - Set project visibility
  - View project details and member lists
  - Restrict project access based on role and membership

- **Task Management**
  - Create tasks within projects
  - Assign tasks to project members
  - Set priority levels: `Low`, `Medium`, `High`, `Critical`
  - Set due dates
  - Add task descriptions
  - Add comments for collaboration and context
  - Edit and update task details over time

- **Task Board / Kanban View**
  - Display tasks in columns: `Todo`, `In Progress`, `In Review`, `Done`
  - Drag-and-drop tasks between columns
  - Update task status automatically based on column movement
  - Reflect board changes in real time across all connected clients

- **Real-Time Collaboration**
  - Instant task status updates via WebSockets
  - Live presence indicators showing which users are online
  - Real-time notifications for task assignments and task updates
  - Synchronized task state for all active users in a project

- **Activity Log**
  - Track all task changes
  - Store timestamps for each action
  - Capture user information for each update
  - Maintain an audit trail for task movement, assignment, edits, and comments

### 3. User Roles & Permissions
The system will support exactly three user roles:

- **Admin**
  - Full access to the platform
  - Can create and delete projects
  - Can manage members
  - Can manage all tasks
  - Can view activity logs

- **Project Manager**
  - Can create projects
  - Can manage tasks within their projects
  - Can invite members to their projects

- **Member**
  - Can view assigned projects
  - Can create, update, and move tasks
  - Can comment on tasks

| Action | Admin | Project Manager | Member |
|---|---|---|---|
| Create projects | Yes | Yes | No |
| Update project details | Yes | Yes (own projects) | No |
| Delete projects | Yes | No | No |
| Invite/manage project members | Yes | Yes (own projects) | No |
| Set project visibility | Yes | Yes (own projects) | No |
| View assigned projects | Yes | Yes | Yes |
| Create tasks | Yes | Yes (own projects) | Yes |
| Update tasks | Yes | Yes (own projects) | Yes |
| Move tasks across board columns | Yes | Yes (own projects) | Yes |
| Assign tasks to members | Yes | Yes (own projects) | No |
| Comment on tasks | Yes | Yes | Yes |
| View activity logs | Yes | Yes (own projects) | No |
| Manage all tasks across all projects | Yes | No | No |

### 4. Assumptions
- Users have modern browsers with WebSocket support
- MongoDB Atlas will be used as the cloud database
- Redis will be used as the Socket.IO adapter for horizontal scaling
- The system is single-tenant and intended for one company
- File attachments are not included in v1
- Email notifications are out of scope for v1

### 5. Out-of-Scope Items
- File/image uploads
- Email/push notifications
- Calendar integration
- Time tracking
- Gantt charts
- Mobile app
- Multi-tenant support
- Advanced reporting/analytics

### 6. Non-Functional Requirements
- API response time must be less than `200ms` under normal load
- WebSocket event latency must be less than `100ms`
- The system must support `50+` concurrent users
- JWT token expiry: `15 minutes` access, `7 days` refresh
- Rate limiting must be applied to authentication endpoints
