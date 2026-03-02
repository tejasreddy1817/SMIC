# SMIC Pro - Deployment Guide

## Local Development

### Prerequisites
- Node.js 20+
- MongoDB 7+
- PostgreSQL 16+
- npm or yarn

### Setup

1. **Frontend .env**
```bash
# .env
VITE_BACKEND_URL=http://localhost:4000
VITE_SUPABASE_PROJECT_ID=jhkxaryqenoonffxleiw
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_URL=https://jhkxaryqenoonffxleiw.supabase.co
```

2. **Backend .env**
```bash
# server/.env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/SMIC_pro
PGHOST=localhost
PGUSER=postgres
PGPASSWORD=SMIC_pro_password_123
PGDATABASE=SMIC_pro
PGPORT=5432
JWT_SECRET=TbdskhbiwedshfvbidnvjebdHKdJyeioiverirhejbsgklG==
OPENAI_API_KEY=sk-your-openai-key
INSTAGRAM_API_KEY=your_instagram_key
YOUTUBE_API_KEY=your_youtube_key
NODE_ENV=development
```

3. **Start Services**

Frontend:
```bash
npm install
npm run dev
# Access: http://localhost:8080
```

Backend (in another terminal):
```bash
cd server
npm install
npm run dev
# Server: http://localhost:4000
```

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# Services will be available at:
# Frontend: http://localhost:3000
# Backend: http://localhost:4000
# pgAdmin: http://localhost:5050
# MongoDB: localhost:27017
# PostgreSQL: localhost:5432
```

### Individual Docker Builds

**Backend:**
```bash
docker build -f Dockerfile.server -t SMIC-pro-backend:latest .
docker run -p 4000:4000 --env-file server/.env SMIC-pro-backend:latest
```

**Frontend:**
```bash
docker build -f Dockerfile -t SMIC-pro-frontend:latest .
docker run -p 3000:3000 SMIC-pro-frontend:latest
```

## Environment Variables Reference

### Backend (server/.env)
- `PORT` - Server port (default: 4000)
- `MONGODB_URI` - MongoDB connection string
- `PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT` - PostgreSQL config
- `JWT_SECRET` - Secret key for JWT tokens (keep secure!)
- `OPENAI_API_KEY` - OpenAI API key for embeddings & LLM
- `INSTAGRAM_API_KEY` - Instagram API credentials
- `YOUTUBE_API_KEY` - YouTube API credentials
- `NODE_ENV` - environment (development/production)
 - `CORS_ORIGINS` - (optional) comma-separated list of allowed origins for CORS. Example: `http://localhost:5173,http://localhost:3000,https://app.example.com`

### Instagram OAuth (required env vars)

- `INSTAGRAM_CLIENT_ID` - Meta App ID for Instagram / Facebook login
- `INSTAGRAM_CLIENT_SECRET` - Meta App Secret (store securely)
- `INSTAGRAM_REDIRECT_URI` - Exact server callback URL configured in Meta App (e.g. `https://your-domain.com/api/auth/instagram/callback`)
- `ALLOWED_REDIRECT_URIS` - Comma-separated list of allowed frontend redirect URIs (e.g. `https://your-frontend.com/auth/instagram/callback,http://localhost:5173/auth/instagram/callback`)

Notes:
- The server endpoints added: `GET /api/auth/instagram/url` (returns a Meta auth URL and server state) and `GET /api/auth/instagram/callback` (server-side OAuth callback). The frontend uses `/auth/instagram/callback` to capture the issued JWT in the URL fragment and store it in `localStorage` as `server_token`.
- Keep `INSTAGRAM_CLIENT_SECRET` out of frontend code and CI logs; use a secrets manager in production.
- Ensure the value of `INSTAGRAM_REDIRECT_URI` exactly matches the redirect configured in your Meta app settings and that `ALLOWED_REDIRECT_URIS` includes the frontend redirect you pass to `/api/auth/instagram/url`.

Quick setup checklist for Meta app:

1. Create a Meta App (https://developers.facebook.com/apps) and add "Facebook Login" and the appropriate Instagram products (Instagram Basic Display or Instagram Graph API) depending on your needs.
2. Configure the OAuth redirect URI to point to your server callback (see `INSTAGRAM_REDIRECT_URI`).
3. Request appropriate scopes for the data you need (e.g., `instagram_basic`, `pages_show_list`, `pages_read_engagement`). App review may be required for production access.
4. Use `INSTAGRAM_CLIENT_ID` and `INSTAGRAM_CLIENT_SECRET` from the app dashboard.

Debugging tips:
- For local testing, include `http://localhost:5173/auth/instagram/callback` (or your frontend dev URL) in `ALLOWED_REDIRECT_URIS` and set `INSTAGRAM_REDIRECT_URI` to your server's callback (e.g., `http://localhost:4000/api/auth/instagram/callback`).
- The server issues the JWT and redirects to the frontend callback with the token in the fragment (`#token=...`) to avoid logging tokens on the server access logs.
- If you get "Invalid state" errors, ensure the `state` returned from `/api/auth/instagram/url` is preserved and consumed by the callback; server state TTL is 15 minutes.

Privacy & compliance notes:
- Only request the minimum scopes required for your feature set. Do not auto-assign roles based on Instagram profile data — role assignment remains manual via internal RBAC endpoints.
- Log auth events to `AuditLog` for auditability and set retention according to your policy.
- Provide an account unlink option (`POST /api/auth/instagram/unlink`) which revokes tokens and removes stored Instagram metadata.

### Frontend (.env)
- `VITE_BACKEND_URL` - Backend API URL
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase public key
- `VITE_SUPABASE_URL` - Supabase URL

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### API Keys
- `POST /api/keys/set` - Store API keys (protected)
- `GET /api/keys/get` - Retrieve stored API keys (protected)

### RAG (Retrieval-Augmented Generation)
- `POST /api/rag/upsert` - Upsert documents with embeddings
- `POST /api/rag/query` - Query documents with RAG

### Chat
- `POST /api/chat/message` - Save chat message
- `GET /api/chat/history` - Get chat history
- `POST /api/chat/chat` - Send message and get LLM response

### Agents
- `POST /api/agents/run` - Run multi-agent orchestration

### Health
- `GET /health` - Health check endpoint

## Production Deployment

### Using Docker Stack (Swarm)

```bash
# Initialize swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml SMIC_pro
```

### Environment Secrets (Production)
Store sensitive values in `.env` or use cloud secret managers:
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault
- GitHub Secrets (for CI/CD)

### Database Backups
MongoDB:
```bash
docker exec SMIC_pro_mongo mongodump --out /backup
```

PostgreSQL:
```bash
docker exec SMIC_pro_postgres pg_dump -U postgres SMIC_pro > backup.sql
```

## Troubleshooting

### Backend won't start
- Check MongoDB connection: `mongodb://admin:admin@mongo:27017/SMIC_pro?authSource=admin`
- Check PostgreSQL is running: `docker ps | grep postgres`
- Verify `node_modules` installed: `cd server && npm install`

### Frontend can't connect to backend
- Check `VITE_BACKEND_URL` in docker-compose.yml
- Ensure backend is running: `curl http://localhost:4000/health`
- Check CORS configuration in server

### pgAdmin access issues
- Default email: admin@SMIC.dev
- Default password: admin
- Connect to PostgreSQL server: `postgres:5432`

## API Usage Examples

### Register & Login
```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secure123"}'

# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secure123"}'
```

### RAG Query
```bash
curl -X POST http://localhost:4000/api/rag/query \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is SMIC Pro?"}'
```

### Chat
```bash
curl -X POST http://localhost:4000/api/chat/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, how can you help me?"}'
```
