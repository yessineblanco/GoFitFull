# Journal de bord - GoFit

**Project:** GoFit - fitness mobile app and admin platform  
**Period covered:** Weeks 1 to 7, from 26 January 2026 to 16 March 2026  
**Intern:** [Your first and last name]  
**Specialty:** [Your specialty]  
**Host organization:** [Organization name]  
**Supervisor:** [Supervisor name]

> Scope: this document keeps the same journal period as the example, but the content is adapted to the real GoFit roadmap and repository.

---

## Requirements and project scope (Week 1: 26 Jan - 2 Feb 2026)

During the first week, I focused on understanding the GoFit project and defining its scope. GoFit is not only a simple fitness app: it is a platform composed of a React Native mobile application, a Next.js admin panel, and a Supabase backend. The first work was to identify the main objectives of the product and the first features to prioritize.

I worked on clarifying the user journeys: a client creates an account, completes a profile, browses exercises, plans workouts, follows a session, and tracks progress. I also noted the admin side, where exercises, users, and platform data must be managed. This helped me separate the mobile user experience from the administration needs.

I learned that a broad idea like "fitness platform" must be reduced into clear and testable requirements. The main difficulty was avoiding feature creep, because the project includes many possible modules such as coaches, marketplace, video calls, body measurements, and notifications. I handled this by keeping the first scope centered on authentication, profiles, workouts, exercises, and progress tracking.

## UI/UX design and mockups (Week 2: 2 Feb - 9 Feb 2026)

This week was dedicated to the design part of the project. I studied the expected screens for the mobile app and the admin panel, and I compared them with the functional needs from the previous week. For the mobile app, the important point was to keep the interface easy to use during a workout, with clear navigation, readable information, and simple actions.

I paid attention to screens such as login, onboarding/profile setup, workout planning, exercise list, workout session, and progress views. I also considered the states that are easy to forget in mockups: loading, empty data, form errors, and offline or failed requests.

I learned that UI/UX is not only about making screens look good. For a fitness app, the design must support fast decisions while the user is training. The difficulty was balancing a rich product vision with a simple first version. I kept notes about missing states and future improvements instead of trying to include everything immediately.

## Development environment setup (Week 3: 9 Feb - 16 Feb 2026)

During this week, I prepared the development environment for the project. The GoFit mobile app uses Expo and React Native, while the admin panel uses Next.js. I checked the project structure, the package configuration, and the tools needed to run the application locally.

For the mobile side, I had to understand the Expo setup, development client workflow, Android/iOS configuration, and the role of environment variables. For the backend, I reviewed the Supabase configuration and the importance of not exposing private keys. I also looked at the repository organization, where the mobile app, admin panel, database files, Supabase functions, and documentation are separated.

I learned that environment setup is a real part of software development, not just a preparation step. The main difficulty was making sure the different tools fit together: Expo, TypeScript, Supabase, and the admin web project. I documented important setup points so that problems could be reproduced and fixed more easily.

## React Native, Next.js, and Supabase setup (Week 4: 16 Feb - 23 Feb 2026)

This week, I worked on the technical base of GoFit. I studied how the React Native mobile app communicates with Supabase and how the Next.js admin panel fits into the same platform. I also reviewed the folder structure used for screens, services, stores, navigation, and shared configuration.

On the mobile side, the project uses React Native with Expo, TypeScript, React Navigation, Zustand for state management, and Supabase JS for backend access. On the admin side, the project uses Next.js with TypeScript, Tailwind/shadcn UI components, and Supabase clients for server and browser access.

I learned how a multi-part application must stay organized so that mobile, web, and backend responsibilities do not become mixed. The difficulty was understanding where each feature should live: screen logic, service calls, store state, database schema, or admin interface. I handled this by following the existing project structure instead of inventing a new one.

## Authentication and user profile (Week 5: 23 Feb - 2 Mar 2026)

During this week, I focused on authentication and profile management. This included the main user flows: sign up, log in, log out, password reset, and protected navigation after authentication. Since GoFit uses Supabase Auth, I had to understand both the user experience and the security side of the feature.

I also studied the user profile flow: storing personal information, updating profile data, and linking the profile to the authenticated user. This part is important because later features, such as workouts, progress, notifications, and measurements, depend on a reliable user identity.

I learned that authentication is not just a form with an email and password. It includes session handling, error messages, redirects, protected screens, and secure storage of tokens on mobile. The main difficulty was thinking about unhappy paths, such as wrong credentials, expired sessions, or incomplete profiles. I handled this by checking the flow step by step instead of only testing the success case.

## Workout planner core, part 1 (Week 6: 2 Mar - 9 Mar 2026)

This week, I started working on the core workout planner. The goal was to understand and implement the first usable flow for creating or following a workout session. This included workouts, exercises, sets, reps, rest time, and saving the information in the database.

I studied the data model carefully because GoFit separates workout templates from real workout sessions. Exercises are stored once in a master exercise library, workouts define a plan, and workout sessions record what the user actually performed. This structure is important because it avoids duplicating exercise data and keeps historical workout data reliable.

I learned that domain modeling is one of the most important parts of a fitness application. A mistake between a workout template and a completed session can create confusing data later. The main difficulty was keeping the first version simple while still respecting the database design. I focused on the minimum path: create or select a workout, associate exercises with sets and reps, and prepare the session flow.

## Workout planner core, part 2 (Week 7: 9 Mar - 16 Mar 2026)

During this week, I continued the workout planner work by focusing on the practical session experience. I worked on the logic around exercise order, rest time, session progress, and saving completed workout data. The objective was to make the workout flow usable, not only technically correct.

I also considered the calendar and scheduling side of the planner. A workout app must help the user know what to do today, not only store a list of exercises. This required thinking about dates, planned sessions, completed sessions, and how the information should appear in the mobile interface.

I learned that the workout planner connects many parts of the system: UI screens, local state, Supabase tables, and user-specific data protected by Row Level Security. The main difficulty was date and session consistency, especially avoiding confusion between a planned workout and an executed workout. I handled this by keeping the data model clear and testing the flow in small steps.

