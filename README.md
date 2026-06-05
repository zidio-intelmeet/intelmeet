# 🎯 IntellMeet v2.0 - Enterprise Meeting Platform

<div align="center">

**AI-Powered Real-Time Enterprise Meeting Platform**

[![Test & Build](https://github.com/yourusername/intelmeet/actions/workflows/test-build.yml/badge.svg)](https://github.com/yourusername/intelmeet/actions)
[![Deploy](https://github.com/yourusername/intelmeet/actions/workflows/deploy.yml/badge.svg)](https://github.com/yourusername/intelmeet/actions)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)

**[Demo](#-demo) • [Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Deployment](#-deployment)**

</div>

---

## 🎬 Demo

The application is deployed and available at:
- **Frontend (Vercel):** [https://intelmeet-alpha.vercel.app/](https://intelmeet-alpha.vercel.app/)
- **Backend (Render):** [https://intelmeet-ff4w.onrender.com](https://intelmeet-ff4w.onrender.com)

---

## ✨ Features

### 🎥 Real-Time Video Meetings
- High-quality video/audio with WebRTC
- Screen sharing for presentations
- Meeting recording with automatic transcription
- Real-time participant tracking

### 🤖 AI-Powered Intelligence
- Automatic transcription using OpenAI Whisper
- AI meeting summaries
- Action item extraction from conversations
- Sentiment analysis

### 👥 Team Collaboration
- Real-time chat during meetings
- Mention notifications
- Action items with task assignment
- Team workspaces with RBAC

### 🔒 Enterprise Security
- End-to-end encryption
- Multi-tenant isolation
- Role-based access control
- JWT authentication with refresh tokens

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Node.js 20+, Express.js, TypeScript, MongoDB, Redis, Socket.io |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Zustand |
| **Infrastructure** | Docker, GitHub Actions, Render, Vercel |
| **AI** | OpenAI (Whisper + GPT-3.5-turbo) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- MongoDB Atlas account
- OpenAI API key
- Google OAuth credentials

### Local Development (5 minutes)

```bash
# 1. Clone and setup
git clone https://github.com/yourusername/intelmeet.git
cd intelmeet

# 2. Copy and configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Start all services
docker-compose up -d

# 4. Verify installation
curl http://localhost:3000/api/health
open http://localhost
```

**Services:**
- Frontend: http://localhost
- Backend API: http://localhost:3000
- MongoDB: localhost:27017
- Redis: localhost:6379

---

## 📦 Installation

### Without Docker (Development)

```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

### With Docker (Production)

```bash
docker-compose build
docker-compose up -d
docker-compose logs -f
```

---

## ⚙️ Configuration

Create `.env` file with:

```bash
# Core
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/intellmeet

# Redis
REDIS_URL=redis://:password@hostname:6379

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# OpenAI
OPENAI_API_KEY=sk-your-api-key
```

See [.env.example](./.env.example) for complete options.

---

## 🔧 Development

### Project Structure

```
intelmeet/
├── backend/          # Express API with real-time features
├── frontend/         # React SPA with Vite
├── docker-compose.yml
├── .github/workflows/
└── README.md
```

### Common Commands

```bash
# Backend
cd backend && npm run build && npm run dev

# Frontend
cd frontend && npm run build && npm run dev

# Docker
docker-compose up -d
docker-compose down
docker-compose logs -f backend
```

---

## 🌍 Deployment

### Option 1: Render + Vercel (Recommended)
1. Push to GitHub
2. Connect Render for backend (auto-deploys): [https://intelmeet-ff4w.onrender.com](https://intelmeet-ff4w.onrender.com)
3. Connect Vercel for frontend (auto-deploys): [https://intelmeet-alpha.vercel.app/](https://intelmeet-alpha.vercel.app/)

### Option 2: Docker (Self-Hosted)
```bash
docker push your-registry/intellmeet-backend
docker push your-registry/intellmeet-frontend
# Deploy via platform
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full guide.

---

## 📚 API Documentation

### Quick Reference
```bash
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh

# Meetings
GET    /api/meetings
POST   /api/meetings
GET    /api/meetings/:id

# AI
POST   /api/ai/summarize
POST   /api/ai/extract-actions

# Tasks
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
```

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for full API reference.

---

## 🤝 Contributing

Contributions welcome! [See CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)
