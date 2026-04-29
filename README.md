# intellMeet

This project is , a modern TypeScript stack that combines React, Vite , Express, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **React + Vite** - Client-routed React SPA powered by Vite
- **TailwindCSS** - CSS framework
- **shadcn/ui** - UI components
- **Express** - Fast, unopinionated web framework
- **Node.js** - Runtime environment
- **Mongoose** - TypeScript-first ORM
- **MongoDB** - Database engine

## Getting Started

First, install the dependencies:

```bash
npm install
```

## Database Setup

This project uses MongoDB with mongoose.

1. Make sure you have MongoDB set up.
2. Update your `apps/server/.env` file with your MongoDB connection URI.

3. Apply the schema to your database:

```bash
npm run db:push
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
intellMeet/
├── apps/
│   ├── web/         # Frontend application (React + Vite SPA)
│   └── server/      # Backend API (Express)
├── packages/
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `npm run dev`: Start all applications in development mode
- `npm run build`: Build all applications
- `npm run dev:web`: Start only the web application
- `npm run dev:server`: Start only the server
- `npm run check-types`: Check TypeScript types across all apps
- `npm run db:push`: Push schema changes to database
- `npm run db:studio`: Open database studio UI
