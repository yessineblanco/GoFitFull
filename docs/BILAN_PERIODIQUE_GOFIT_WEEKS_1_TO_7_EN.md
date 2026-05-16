# Bilan periodique - GoFit

**Project:** GoFit - fitness mobile app and admin platform  
**Period covered:** Weeks 1 to 7, from 26 January 2026 to 16 March 2026  
**Name:** [Your first and last name]  
**Specialty:** [Your specialty]  
**Host organization:** [Organization name]

> Scope: this document keeps the same periodic-review questions as the example, but the answers cover the first 7 weeks of the GoFit internship.

---

## Work completed during the first 7 weeks

During the first week, I worked on understanding the GoFit project and defining the first scope. I identified the main product parts: the Expo/React Native mobile app, the Next.js admin panel, and the Supabase backend. I also clarified the first user journeys around account creation, profile setup, workouts, exercises, and progress tracking.

During the second week, I focused on UI/UX and mockups. I studied the expected screens for authentication, onboarding, workout planning, exercise browsing, workout sessions, and progress views. I paid attention to practical states such as loading, empty data, errors, and simple navigation during training.

During the third week, I prepared the development environment. I reviewed the Expo mobile setup, the admin panel setup, environment variables, Supabase configuration, and the repository structure. This helped me understand how the different parts of the project are organized.

During the fourth week, I studied the technical architecture more deeply. I reviewed the React Native app structure, the Next.js admin panel, Supabase Auth, database access, services, stores, and navigation. This helped me understand where each responsibility belongs in the codebase.

During the fifth week, I focused on authentication and profile management. I studied sign-up, login, logout, password reset, protected navigation, user profile data, and the importance of secure session handling.

During the sixth week, I started the workout planner core. I worked on understanding workouts, exercises, sets, reps, rest time, and saving user-specific data. I also studied the difference between workout templates and real workout sessions.

During the seventh week, I continued the workout planner work by focusing on the practical session flow, exercise order, rest timer logic, completed sessions, and the relation between planned workouts and actual user activity.

## What do you enjoy and what motivates you in your internship?

What I enjoy most is working on a real product with several connected parts. GoFit is not only a screen prototype: it includes an Expo/React Native mobile app, a Next.js admin panel, and a Supabase backend with authentication, database tables, storage, and security rules.

I am motivated by the fact that the features have a concrete user purpose. For example, the workout planner is not just a form: it must help a user choose exercises, define sets and reps, manage rest time, and save completed sessions. I like seeing how a technical decision, such as separating workout templates from workout sessions, directly affects the quality of the user experience.

## Describe a memorable work situation from your internship.

A memorable situation was when I worked on the workout planner data model. At first, it looked simple: a user creates a workout and starts training. But when I studied it more carefully, I understood that GoFit needs to separate several concepts: the master exercise library, workout templates, exercise configuration inside a workout, and real workout sessions completed by the user.

This was important because storing everything in one place would make the data harder to maintain. For example, an exercise can be updated later, but an old workout session should still keep a reliable record of what the user did. This situation helped me understand the importance of database design and not only focusing on the visible interface.

## Have you faced a difficult or problematic situation? If yes, how did you react?

Yes. One difficult situation was understanding how the different parts of GoFit connect together: mobile screens, Zustand state, Supabase services, authentication, database tables, and admin management. A feature can look isolated in the interface, but it often depends on several layers.

I reacted by breaking the problem into smaller parts. For the workout planner, I separated the questions: what data belongs to an exercise, what data belongs to a workout template, what data belongs to a completed session, and what must be user-specific. I also used the existing documentation and repository structure instead of trying to solve everything from memory. This made the work more structured and helped me avoid confusion.

## What have you learned since the start of your internship?

Since the beginning of my internship, I have learned how a real application is built progressively. The first weeks were not only coding: they included requirements, UI/UX thinking, environment setup, project architecture, authentication, and database modeling.

Technically, I learned more about React Native with Expo, Next.js, TypeScript, Supabase Auth, protected user data, and the difference between frontend state and persistent backend data. Professionally, I learned that a developer must communicate clearly, document decisions, and test flows step by step, especially when a feature connects several parts of the system.

## How do you manage deadlines in your work?

I manage deadlines by dividing the work into small deliverables for each week. First, I focus on understanding and structuring the task, then I move to the technical part, and finally I verify the main flow. For example, in the workout planner, I do not try to build every advanced feature at once. I first focus on the core flow: create or select a workout, add exercises, define sets and reps, manage rest time, and save the session.

When a task becomes too large, I reduce it to a testable part and keep the remaining improvements visible for later. This helps me make regular progress and gives my supervisor something concrete to review.

## In what ways do you use your abilities and talents during your internship? Give concrete examples.

I use my analytical skills to understand how the product should work before coding. For example, I analyzed the difference between an exercise, a workout template, a workout exercise, and a workout session so the planner could be based on a cleaner structure.

I also use organization and persistence. I take notes about errors, environment setup, database decisions, and feature limits. For example, when working with authentication and user-specific data, I pay attention to which data belongs to the logged-in user and how it should be protected through Supabase policies.

## How do you evaluate your ability to work in a team?

**Suggested rating: 3 / 4**

I gave myself this rating because I communicate with my supervisor to clarify the scope and validate my understanding before going too far. For example, during the workout planner work, I used feedback to keep the first version focused on the main session flow instead of adding too many secondary features too early.

## How do you evaluate your ability to be autonomous?

**Suggested rating: 3 / 4**

I gave myself this rating because I can move forward by reading the existing documentation, checking the repository structure, and proposing an approach before asking for validation. For example, I studied the database model and Supabase integration to understand how workouts and sessions should be saved.

## How do you evaluate your ability to be resilient?

**Suggested rating: 3 / 4**

I gave myself this rating because I keep working even when the project becomes complex. For example, when the workout planner involved several related tables and user-specific data, I did not stop at the first confusion. I separated the model into smaller concepts and reviewed each one until the flow became clearer.

## How do you evaluate your ability to organize your work within deadlines?

**Suggested rating: 3 / 4**

I gave myself this rating because I divide tasks into concrete steps and focus first on what can be demonstrated. For example, in Sprint 3.1, I prioritized the core workout path before polishing every edge case. This allowed me to keep progress visible while still noting the limits to improve later.

## How do you evaluate your ability to take initiative?

**Suggested rating: 3 / 4**

I gave myself this rating because I try to identify problems before they become blockers. For example, I noticed that mixing workout templates and completed sessions could create data confusion, so I paid attention to the model and documented the difference between planned workouts and executed sessions.

## How do you evaluate your ability to deliver quality work?

**Suggested rating: 3 / 4**

I gave myself this rating because I try to produce work that is clear, consistent, and testable. For example, when working on GoFit features, I check that the screen behavior matches the data model and that user data is not treated like public content. I still need to improve by adding more systematic tests, but I already try to verify the main flows manually.

## Would you like to be contacted to discuss the progress of your internship?

**Suggested answer:** Yes, preferably by email or during a short meeting with the supervisor if a point about the project progress needs more explanation.
