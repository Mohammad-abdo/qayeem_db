@echo off
echo ================================================
echo Qayeem Backend - Database Setup
echo ================================================
echo.

echo Step 1: Please ensure MySQL is running in XAMPP
echo Step 2: Create database 'qayeem_db' in phpMyAdmin
echo Step 3: Create .env file with DATABASE_URL
echo.

echo Creating .env file...
(
echo # Database
echo DATABASE_URL="mysql://root:@localhost:3306/qayeem_db?schema=public"
echo.
echo # JWT
echo JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
echo JWT_EXPIRES_IN=7d
echo.
echo # Server
echo PORT=5000
echo NODE_ENV=development
echo.
echo # Frontend URL ^(for CORS^)
echo FRONTEND_URL=http://localhost:5173
) > .env

echo .env file created!
echo.
echo Now running database migrations...
npx prisma migrate dev --name init

echo.
echo Seeding database...
npx prisma db seed

echo.
echo ================================================
echo Setup complete!
echo ================================================
pause



