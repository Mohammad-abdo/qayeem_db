# Database Setup Instructions

## Step 1: Create MySQL Database

### Option A: Using phpMyAdmin (XAMPP)
1. Start XAMPP Control Panel
2. Start MySQL service
3. Open phpMyAdmin: http://localhost/phpmyadmin
4. Click "New" in the left sidebar
5. Database name: `qayeem_db`
6. Collation: `utf8mb4_unicode_ci`
7. Click "Create"

### Option B: Using MySQL Command Line
```sql
CREATE DATABASE qayeem_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## Step 2: Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
DATABASE_URL="mysql://root:@localhost:3306/qayeem_db?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

**Note:** Adjust DATABASE_URL if your MySQL has a password:
- Format: `mysql://USERNAME:PASSWORD@HOST:PORT/DATABASE_NAME`
- Default XAMPP: `mysql://root:@localhost:3306/qayeem_db`

## Step 3: Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

This will:
- Create all database tables based on the schema
- Generate migration files
- Apply migrations to the database

## Step 4: Seed Database (Optional)

```bash
npx prisma db seed
```

This creates:
- Admin user: `admin@qayeem.com` / `admin123`
- Test user: `user@qayeem.com` / `user123`

## Step 5: Verify Database

Open Prisma Studio to view your database:
```bash
npx prisma studio
```

This opens a browser interface at http://localhost:5555

## Troubleshooting

### Connection Error
- Ensure MySQL is running in XAMPP
- Check DATABASE_URL in .env file
- Verify database name is correct

### Migration Errors
- Make sure database exists first
- Check Prisma schema syntax
- Try: `npx prisma migrate reset` (WARNING: deletes all data)



