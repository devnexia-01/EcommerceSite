# E-Commerce Application

A full-stack e-commerce application built with React, Express, and PostgreSQL.

## Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL database running

### Setup Instructions

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:port/database_name
   NODE_ENV=development
   SESSION_SECRET=your-secret-key-here
   ```

   Example for your setup:
   ```env
   DATABASE_URL=postgresql://postgres:Himanshu@2003@localhost:5433/E-Commerce
   NODE_ENV=development
   SESSION_SECRET=your-secret-key-here
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

   This will:
   - Set up the database schema automatically
   - Seed the database with initial data
   - Start the development server

4. **Access the application:**
   - Open your browser to `http://localhost:5000`

## Available Scripts

- `npm start` - Start the application (recommended)
- `npm run dev` - Start development server directly
- `npm run db:push` - Push database schema changes
- `npm run build` - Build for production
- `npm run check` - Type check

## Database Setup

The application uses PostgreSQL with Drizzle ORM. The database schema will be automatically created when you run `npm start`.

### Manual Database Setup (if needed)
```bash
npm run db:push
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `SESSION_SECRET` | Secret for session management | Recommended |
| `PORT` | Server port (default: 5000) | No |

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running on the specified port
- Verify database credentials in `.env` file
- Check if the database exists

### Port Issues
- Default port is 5000
- Change `PORT` environment variable if needed

### Dependencies Issues
- Run `npm install` to ensure all dependencies are installed
- Clear node_modules and package-lock.json if needed, then reinstall