# Qayeem Backend API

This is the backend API for the Qayeem (نظام قيم) evaluation system.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env` (if exists) or create `.env` file
   - Update `DATABASE_URL` with your MySQL connection string
   - Update `JWT_SECRET` with a secure secret key

3. **Setup database:**
   - Make sure MySQL is running (XAMPP)
   - Create database: `qayeem_db`
   - Run migrations:
     ```bash
     npx prisma migrate dev --name init
     ```
   - Generate Prisma Client:
     ```bash
     npx prisma generate
     ```

4. **Seed database (optional):**
   ```bash
   npx prisma db seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

## Environment Variables

```env
DATABASE_URL="mysql://root:@localhost:3306/qayeem_db?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## API Endpoints

- `/api/health` - Health check
- `/api/auth/*` - Authentication endpoints
- `/api/users/*` - User management
- `/api/evaluations/*` - Evaluation management
- `/api/criteria/*` - Criteria management
- `/api/ratings/*` - Rating system
- `/api/reports/*` - Reports and analytics
- `/api/notifications/*` - Notifications

## Testing

Use Postman, Insomnia, or curl to test the API endpoints.



