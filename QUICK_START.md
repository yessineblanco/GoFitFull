# Quick Start Guide - GoFit Admin Panel

Get your admin panel running in 10 minutes!

## Prerequisites
- Supabase account
- Node.js 18+
- Your Supabase project URL and keys

## Step-by-Step Setup

### 1. Run Database Migration (5 min)

```sql
-- Open Supabase Dashboard → SQL Editor
-- Copy and paste: database/migrations/add_admin_role.sql
-- Click "Run"
```

### 2. Create First Admin User (2 min)

```sql
-- Replace with your email
UPDATE public.user_profiles 
SET is_admin = true 
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

Verify:
```sql
SELECT u.email, up.is_admin 
FROM user_profiles up 
JOIN auth.users u ON up.id = u.id 
WHERE up.is_admin = true;
```

### 3. Configure Environment (2 min)

```bash
cd admin-panel
```

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get keys from: Supabase Dashboard → Settings → API

### 4. Start Admin Panel (1 min)

```bash
npm install
npm run dev
```

Open: http://localhost:3000

### 5. Login

- Email: your-email@example.com
- Password: your password

✅ **Success!** You should see the dashboard.

## Troubleshooting

### "Not authorized"
- Run Step 2 again to set is_admin = true
- Check you're using the correct email

### "Connection error"
- Verify `.env.local` has correct Supabase URL/keys
- Check Supabase project is active

### Page not loading
- Ensure you're in `admin-panel/` directory
- Run `npm install` again
- Clear browser cache

## What's Next?

The foundation is complete! Now you can:

1. **Build user management** - View/manage users
2. **Build exercise library** - CRUD for exercises
3. **Build workout management** - Create native workouts

All types and database structures are ready to use.

## Quick Commands

```bash
# Mobile App
cd GoFitMobile
npm start

# Admin Panel
cd admin-panel
npm run dev

# Database
# Run migrations in Supabase SQL Editor
```

## Need Help?

- See `IMPLEMENTATION_SUMMARY.md` for complete overview
- Check `admin-panel/README.md` for detailed docs
- Review `database/ADMIN_ROLE_SETUP.md` for database help

---

**Ready to build!** 🚀
