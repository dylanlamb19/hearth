# Hearth

A quieter social network for people you already know. Built with Next.js 15, React 19, and Tailwind CSS.

## What it does

- Home feed with posts, reactions, and replies
- Friends, groups, and events
- Direct messages
- Marketplace for local listings
- Video and clip sharing
- Notifications, saved posts, and profiles
- Invite codes for bringing people in
- Report and block tools for moderation

## Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Lucide icons

## Run locally

```
git clone https://github.com/dylanlamb19/hearth.git
cd hearth
npm install
npm run dev
```

Open http://localhost:3000.

```
npm run build
npm start
```

## Demo login

Sign up with any email, or use the seeded Ember account shown on the login page.

## Routes

Public: `/`, `/login`, `/signup`, `/forgot-password`, `/about`, `/help`, `/terms`, `/privacy`, `/pricing`

App: `/home`, `/moments`, `/friends`, `/messages`, `/groups`, `/events`, `/marketplace`, `/videos`, `/notifications`, `/saved`, `/profile`

## Status

MVP. Seed data and client-side demo auth for now. Real backend and auth are the next step.
