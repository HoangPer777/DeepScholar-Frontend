# DeepScholar Frontend

Next.js 14 (React) user interface for the scientific article platform.

## Setup

### Prerequisites
- Node.js 20+
- npm or yarn

### Installation

```bash
npm install

# Create .env.local (optional, defaults to localhost services)
# NEXT_PUBLIC_BACKEND_URL=http://localhost:8001/api/v1
# NEXT_PUBLIC_AI_URL=http://localhost:8002/api

npm run dev
```

Service will be available at `http://localhost:3000`.

## 🏗️ Current Scaffold

Currently, this is a minimal Next.js setup with:
- TypeScript configuration
- Tailwind CSS styling framework
- Root layout with SEO metadata
- Landing page showcasing service URLs

## 📋 Planned Features (To Be Implemented)

### Authentication UI
- [ ] Sign up / Login forms
- [ ] Google OAuth integration
- [ ] Facebook OAuth integration
- [ ] User profile/settings page
- [ ] Logout flow

### Article Management
- [ ] Article feed/list view
- [ ] Article detail page
- [ ] PDF upload flow
- [ ] Article edit/delete
- [ ] Article search and filtering

### User Interactions
- [ ] Like button
- [ ] Comment section
- [ ] Bookmark/save article
- [ ] Share article

### AI Integration
- [ ] Chatbot interface
- [ ] Q&A modal
- [ ] Citation display
- [ ] Deep research tool

### Author Features
- [ ] Author profile page
- [ ] Author ranking view
- [ ] Follow author functionality

## 📁 Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page (scaffold)
│   ├── globals.css         # Global styles
│   └── ... (more pages to be added)
├── public/                 # Static assets
├── package.json
├── tsconfig.json
├── next.config.mjs
├── Dockerfile
└── README.md
```

## 🔧 Configuration

### Environment Variables (.env.local)

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001/api/v1
NEXT_PUBLIC_AI_URL=http://localhost:8002/api
```

These are exposed to the browser (NEXT_PUBLIC_ prefix).

## 📦 Tech Stack

- **Framework**: Next.js 14.2+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI**: React 18.3+
- **HTTP**: Fetch API (can add axios/swr later)

## 🎨 Styling Approach

Currently using Tailwind CSS utility classes. See `globals.css` for custom CSS variables and design tokens.

## 🚀 Build & Deploy

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🐳 Docker

```bash
# Build image
docker build -t deepscholar-frontend .

# Run container
docker run -p 3000:3000 deepscholar-frontend
```

Or via docker-compose:
```bash
docker compose up frontend
```

## 📝 Development Tips

- Use `components/` folder for reusable UI components
- Use `hooks/` for custom React hooks
- Use `lib/` for utility functions and API clients
- Use `types/` for TypeScript interfaces
- Create `.env.local` for local overrides

## 🔗 API Integration

Backend services are accessed via environment variables:
- **Backend API**: `NEXT_PUBLIC_BACKEND_URL` (http://localhost:8001/api/v1)
- **AI Service**: `NEXT_PUBLIC_AI_URL` (http://localhost:8002/api)

Suggested structure for API calls:
```typescript
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}
```

## 📚 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [React Hooks Guide](https://react.dev/reference/react/hooks)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📤 Next Steps

1. Create API client in `lib/api.ts`
2. Build auth pages and context
3. Implement article feed
4. Add chatbot interface
5. Style with Tailwind CSS
6. Connect all endpoints

## 📝 License

Internal use - Capstone Project 2026
