# Hearth

A quieter social network for people you already know. Invite-only, no ads, no algorithmic feed — just posts, groups, events, and direct messages with the people you chose to let in.

## Stack

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (client-side demo auth for now; real backend is next)
- **Data:** localStorage-backed seed data for demo purposes

## Features

- Feed with posts, likes, and comments
- Friends system with requests and suggestions
- Groups with membership and group posts
- Events with RSVPs
- Marketplace listings
- Direct messages
- Moments (stories) and Clips (short video)
- Invite codes for controlled growth
- Report and block for moderation

## Getting started

```
npm install
npm run dev
```

Open http://localhost:3000. Sign in with any email to explore the demo.

## What's next

- Real backend with a database (Postgres) instead of localStorage
- Server-side auth (sessions or JWT) instead of client-side demo auth
- Image and video upload for posts, moments, and clips
- Push notifications for replies and mentions
- Search across posts, people, and groups

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Known gaps are tracked in [ISSUES.md](ISSUES.md).