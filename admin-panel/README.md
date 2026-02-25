# GoFit Admin Panel 🏋️‍♂️

A powerful web-based admin dashboard for the [GoFit fitness tracking application](https://github.com/yessineblanco/GoFit), built with **Next.js 15**, **TypeScript**, **Tailwind CSS**, **shadcn/ui**, and **Supabase**.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwind-css)

## ✨ Features

### 🔐 Authentication & Authorization
- Secure admin login with Supabase authentication
- Role-based access control with `is_admin` flag
- Protected routes with Next.js middleware
- Session management with SSR support

### 👥 User Management
- View all registered users
- Display user profiles with emails and display names
- Visual admin status indicators
- User statistics dashboard

### 📚 Exercise Library Management
- **List & Search**: Browse all exercises with filtering
- **Create**: Add new exercises with detailed configuration
  - Categories (Chest, Back, Legs, Shoulders, Arms, Core, Cardio)
  - Difficulty levels (Beginner, Intermediate, Advanced)
  - Muscle group targeting (multi-select)
  - Equipment requirements
  - Default sets, reps, and rest time
  - Image and video URLs
  - Step-by-step instructions
- **Edit**: Update existing exercises with pre-populated forms
- **Delete**: Remove exercises with confirmation dialogs

### 💪 Native Workouts Management
- **List & Browse**: Visual workout cards with stats
- **Create Workouts**: Comprehensive workout builder
  - Single-day workouts
  - Multi-day splits (2-7 days) for Push/Pull/Legs, etc.
  - Exercise selection from library
  - Per-exercise configuration (sets, reps, rest time)
  - Automatic exercise ordering
  - Workout images
- **Edit Workouts**: Modify existing workouts and exercise configs
- **Delete Workouts**: Remove with cascade confirmation

### 📊 Dashboard
- Overview statistics
- Total users count
- Exercise library metrics
- Workout analytics
- Quick navigation

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Supabase** account and project
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yessineblanco/Gofit-AdminPanel.git
   cd Gofit-AdminPanel
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

   > ⚠️ **Important**: The `SUPABASE_SERVICE_ROLE_KEY` is required for admin operations that bypass RLS. Keep it secret!

4. **Set up the database**
   
   Run the admin role migration in your Supabase SQL editor:
   ```sql
   -- See database/migrations/add_admin_role.sql in the main GoFit repo
   ALTER TABLE public.user_profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
   ```

5. **Make your account an admin**
   
   In Supabase SQL editor:
   ```sql
   UPDATE public.user_profiles 
   SET is_admin = TRUE 
   WHERE id = 'your-user-id';
   ```

6. **Run the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
admin-panel/
├── app/                      # Next.js 15 App Router
│   ├── api/                  # API routes
│   │   ├── exercises/        # Exercise CRUD endpoints
│   │   └── workouts/         # Workout CRUD endpoints
│   ├── dashboard/            # Main dashboard
│   ├── exercises/            # Exercise management pages
│   ├── workouts/             # Workout management pages
│   ├── users/                # User management pages
│   ├── settings/             # Settings page
│   └── login/                # Login page
├── components/               # React components
│   ├── exercises/            # Exercise-specific components
│   ├── workouts/             # Workout-specific components
│   ├── layout/               # Sidebar, Navbar
│   └── ui/                   # shadcn/ui components
├── lib/                      # Utility functions
│   ├── supabase/             # Supabase clients
│   │   ├── client.ts         # Browser client
│   │   ├── server.ts         # Server client
│   │   └── admin.ts          # Service role client
│   └── utils.ts              # Helper functions
├── types/                    # TypeScript types
│   └── database.ts           # Database schema types
└── middleware.ts             # Route protection
```

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS v3](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend**: [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **Authentication**: Supabase Auth with SSR
- **Validation**: Zod (planned)
- **State Management**: React Hooks + Next.js Server Actions

## 🔒 Security

- **Server-side authentication**: All routes protected with middleware
- **Role-based access**: Admin-only access with database flag
- **Service role operations**: Admin client bypasses RLS for management
- **Environment variables**: Sensitive keys stored in `.env.local`
- **Input validation**: Server-side validation for all forms
- **SQL injection prevention**: Supabase parameterized queries

## 📝 API Endpoints

### Exercises
- `GET /api/exercises` - List all exercises
- `POST /api/exercises` - Create new exercise
- `GET /api/exercises/[id]` - Get single exercise
- `PUT /api/exercises/[id]` - Update exercise
- `DELETE /api/exercises/[id]` - Delete exercise

### Workouts
- `GET /api/workouts` - List all native workouts
- `POST /api/workouts` - Create new workout
- `GET /api/workouts/[id]` - Get single workout with exercises
- `PUT /api/workouts/[id]` - Update workout
- `DELETE /api/workouts/[id]` - Delete workout (cascade)

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Push your code to GitHub** (already done!)

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import `yessineblanco/Gofit-AdminPanel`

3. **Configure environment variables**
   - Add all variables from `.env.local`
   - Deploy!

4. **Update Supabase settings**
   - Add your Vercel domain to Supabase Auth allowed URLs

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
```

## 🧪 Testing

Currently, the admin panel has been manually tested. Automated tests are planned for future releases.

To test manually:
1. Create exercises with different configurations
2. Build workouts using created exercises
3. Test single-day and multi-day split workouts
4. Verify edit and delete operations
5. Check mobile app integration

## 🤝 Contributing

This is a private project, but suggestions and feedback are welcome!

## 📄 License

This project is part of the GoFit fitness tracking application ecosystem.

## 🔗 Related Projects

- [GoFit Mobile App](https://github.com/yessineblanco) - React Native + Expo mobile application
- GoFit Database - Supabase PostgreSQL schema and migrations

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Contact: yessine.blanco@esprit.tn

## 🎯 Roadmap

- [ ] User detail pages with workout history
- [ ] Promote/demote admin functionality
- [ ] Analytics dashboard with charts
- [ ] Image upload to Supabase Storage
- [ ] Bulk import/export for exercises
- [ ] Workout templates and categories
- [ ] Real-time updates with Supabase Realtime
- [ ] Advanced search and filtering
- [ ] Audit logs for admin actions
- [ ] Unit and integration tests

## 📸 Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x400?text=Dashboard+Screenshot)

### Exercise Library
![Exercise Library](https://via.placeholder.com/800x400?text=Exercise+Library+Screenshot)

### Workout Builder
![Workout Builder](https://via.placeholder.com/800x400?text=Workout+Builder+Screenshot)

---

**Built with ❤️ by [Yessine Blanco](https://github.com/yessineblanco)**
