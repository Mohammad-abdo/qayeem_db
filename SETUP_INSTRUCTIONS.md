# Quick Setup Instructions

## Before Running Migrations:

1. **Start MySQL in XAMPP:**
   - Open XAMPP Control Panel
   - Click "Start" next to MySQL

2. **Create Database:**
   - Open phpMyAdmin: http://localhost/phpmyadmin
   - Click "New" → Database name: `qayeem_db` → Create

3. **Create .env file:**
   ```env
   DATABASE_URL="mysql://root:@localhost:3306/qayeem_db?schema=public"
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
   JWT_EXPIRES_IN=7d
   PORT=5000
   NODE_ENV=development
   FRONTEND_URL=http://localhost:5173
   ```
   
   **OR** run: `setup-database.bat` (Windows) to auto-create .env

4. **Run Migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Seed Database:**
   ```bash
   npx prisma db seed
   ```

6. **Start Server:**
   ```bash
   npm run dev
   ```

## Default Login Credentials (after seeding):

- **Admin:** `admin@qayeem.com` / `admin123`
- **User:** `user@qayeem.com` / `user123`

## Test API:

- Health check: http://localhost:5000/api/health
- Login: POST http://localhost:5000/api/auth/login



