# ProjectFlow: Internal Project Management System
### Loom Video Presentation Script
**Duration:** 8-10 Minutes

---

## [0:00 - 1:30] SYSTEM ARCHITECTURE & FLOW

*(Visual: Intro Slide -> Switch to System Architecture Diagram)*

**"Welcome. Today I'll be walking you through ProjectFlow, an internal project management system built to tackle real-time collaboration. Let's start with the architecture."**

**"The system has three main layers."** 
*(Cursor clearly pointing to frontend box)*
**"At the presentation layer, we have our Client built with React and Zustand for highly performant state management. The Client talks to the backend over standard HTTPS for REST API operations, while simultaneously maintaining a persistent WebSocket connection."**

*(Cursor pointing to the middle server layer)*
**"In the middle, we have our Express API fortified with Socket.IO. This Node.js server follows a strict Service-Layer pattern, meaning our controllers stay incredibly thin. For the realtime flow, we utilize Redis."**

*(Cursor pointing to the backend layer)*
**"At the data tier, we use MongoDB for flexible, schema-driven project data. Now, the request flow looks like this: A user takes an action, which fires a REST API call. The controller hands this off to the service layer. The service validates permissions, mutates MongoDB, and records an activity log. Before returning the HTTP response, the controller emits a Socket event. Finally, the Redis pub/sub layer instantly broadcasts that event to all connected clients. It's robust and fast."**

---

## [1:30 - 3:00] REAL-TIME COMMUNICATION DESIGN

*(Visual: IDE showing `server/src/sockets/index.js` then transition to two browser tabs)*

**"Let's look at how that real-time connection is secured and managed."**

*(Highlighting the JWT handshake middleware)*
**"When the React client boots, it passes the user's JWT inside the socket handshake query. We intercept this connection strictly to verify the token, meaning no anonymous clients can ever connect or snoop on project data."**

*(Highlighting the RedisAdapter setup)*
**"Because we deploy to a scalable cloud environment, we cannot guarantee users are connected to the same server ping. By integrating the Redis adapter, we enable frictionless horizontal scaling. If Server A emits an event, the Redis adapter echoes it to Server B and C instantly."**

**"Our architecture is entirely room-based. When a user clicks into a project dashboard, the client emits a `join` event specifically for that project ID. This means socket events — like `task:created` or `task:deleted` — are only ever broadcast to the people actively looking at that precise project, preventing completely unnecessary client-side noise."**

*(Visual: Two browser tabs sharing the same project board. Drag and drop a task in Tab 1)*
**"And here it is in action. I'm moving a task in this window... and instantly, with practically zero local latency, the column updates for the other user without requiring an entire page refresh."**

---

## [3:00 - 5:00] ONE BACKEND API — LINE BY LINE

*(Visual: IDE showing `routes/task.routes.js`, then `controllers/task.controller.js`, then `services/task.service.js`)*

**"To demonstrate our backend standards, let's dissect arguably the most critical endpoint: updating a task's status."**

*(Show routing file)*
**"Here is the route definition for `PATCH /:taskId/status`. Before it even reaches the controller, it hits our authentication middleware, and then passes through an `express-validator` schema array to guarantee the incoming status string is one of our strict Kanban columns."**

*(Show the `task.controller.js` file)*
**"If valid, it reaches the controller. The controller extracts the `taskId`, the new `status`, and the authenticated `user` payload, and delegates it directly to the Service Layer."**

*(Show the `task.service.js` file)*
**"Inside the service layer is where the actual business logic sits. First, the service enforces strict access limits by verifying the user is an active member of the project via `ensureProjectMembership`. Next, we find the task, update its column assignment, and recalculate its UI order index. Crucially, before returning the updated task, the service triggers `recordActivity`, cleanly persisting a historical log of who moved the task and when."**

*(Back to `task.controller.js`)*
**"Finally, back in the controller, if the service succeeds... we fire our centralized `emitProjectEvent` helper, passing the `taskId` and the newly mapped string. If anything fails inside that service—say, a `403 Forbidden` error—our global `catchAsync` wrapper traps it cleanly and forwards the error back to the client natively."**

---

## [5:00 - 6:30] ONE SOCKET FLOW — EVENT LIFECYCLE

*(Visual: IDE showing `client/src/hooks/useSocket.js` followed by `client/src/store/taskStore.js`)*

**"Now let's trace that socket emission back up to the user."**

**"When User A drops that task in a new column, the backend controller calls `io.to('project:123').emit('task:status_changed', payload)`."**

**"That's intercepted by Redis, copied to every server instance, and pushed down the tunnel to all clients inside that project room. On the frontend, our `useSocket` custom hook is actively listening."**

*(Highlight the `taskStore.handleTaskStatusChanged` call)*
**"The React component receives the `task:status_changed` event and hands the payload straight into our Zustand `taskStore`. Because Zustand manages state immutably outside the UI tree, the handler immediately iterates over the loaded tasks array, intercepts the matching `taskId`, and forcefully overwrites the `status` string."**

**"React sees the state identity change, and seamlessly re-renders just that specific task card into the correct column. The entire lifecycle—from the mouse drop, to the database, through the websocket tunnel, and into the viewer's screen—takes roughly under 100 milliseconds."**

---

## [6:30 - 8:00] DEPLOYMENT & INFRA SETUP

*(Visual: Browser showing Render Dashboard, followed by Vercel/Netlify, then MongoDB Atlas)*

**"Taking this into production requires strict separation of concerns."**

**"Our codebase uses a standard feature branching model. We merge features into the `develop` branch for staging, and push to `main` for production releases."**

*(Show Render dashboard)*
**"The Express API is deployed to Render. The deployment triggered automatically upon git merges via its CI pipeline. Inside Render, the `.env` configuration completely abstracts our deployment keys, preventing any sensitive credentials from sitting in the repository."**

*(Show Vercel or Netlify)*
**"The Vite React client handles front-end distribution. We hooked Vercel directly to the repository as well. When Vercel compiles the production bundle, it injects the `VITE_API_URL` to point heavily back at our Render service."**

*(Show MongoDB Atlas and Redis Cloud or equivalent)*
**"Our data rests natively inside MongoDB Atlas for maximum availability, and we spun up a lightweight Redis instance specifically to act as the traffic cop for our web socket adapters. All network traffic is automatically layered securely over HTTPS enforced via TLS termination at both Render and Vercel's load balancers gracefully."**

---

## [8:00 - 9:30] ONE TECHNICAL MISTAKE & FIX

*(Visual: IDE looking at `client/src/services/api.js` Axios interceptor code block)*

**"During development, I ran into an incredibly frustrating race condition dealing with our authentication lifecycle."**

**"I had built an Axios interceptor pattern to catch `401 Unauthorized` responses and silently refresh the JWT using the refresh token before retrying the failed request."**

**"What went wrong was concurrency. When a user first opened the dashboard, React would simultaneously fire three distinct GET requests: one for projects, one for tasks, and one for notifications. Since the access token was expired, all three requests returned a `401` concurrently... which caused the Axios interceptor to fire the `/api/auth/refresh` endpoint *three times at the exact same moment*."**

**"Because our backend rotates refresh tokens securely on use, the first request succeeded, but it invalidated the token the second and third requests were actively using, logging the user out instantly with a 403 Conflict error."**

**"I fixed this by implementing a Request Queue pattern inside the frontend interceptor. When a 401 is triggered, a boolean flag `isRefreshing` is set to true. Any subsequent requests that fail with a 401 are trapped inside a Promise array, actively waiting. Once the first request successfully negotiates the new tokens, the queue resolves, and the trapped requests replay perfectly. It was a fantastic lesson on asynchronous networking edges."**

---

## [9:30 - 10:00] WRAP UP

*(Visual: Final shot of the App Dashboard or camera)*

**"In summary, this is a production-ready internal project management system."**

**"It features a highly robust real-time collaboration layer backed securely by Redis and Socket.IO. We prioritized clean architecture leveraging thin controllers and fat services, established secure authentication flows with strict JWT rotational policies, and tied it entirely securely down into a reliable CI/CD deployment pipeline."**

**"Thank you so much for taking the time to review my submission."**
