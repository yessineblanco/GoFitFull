# Uizard Prompt: GoFit Authentication UI Redesign

## App Context
**GoFit** is a modern fitness tracking mobile app (React Native) that helps users track workouts, monitor progress, and achieve fitness goals. The app focuses on simplicity, motivation, and an energizing user experience.

---

## Brand Identity & Design System

### Primary Colors
- **Primary Brand Color**: `#84c441` (Vibrant lime green - energetic, fitness-oriented)
- **Primary Dark**: `#6fa335` (Darker green for hover/active states)
- **Primary Light**: `#8dbb5a` (Lighter green for secondary elements)

### Neutral Colors
- **Background**: `#FAFBFC` (Soft warm white)
- **Surface**: `#F5F7F9` (Light gray for cards)
- **Text Primary**: `#1A1D21` (Dark gray, almost black)
- **Text Secondary**: `#5A6570` (Medium gray)
- **Border**: `#D1D7DE` (Light border)

### Typography
- **Primary Font**: Montserrat Alternates (Modern, friendly)
  - Bold (700): Headings
  - SemiBold (600): Subheadings, buttons
  - Regular (400): Body text
- **Display Font**: Designer (Used for special hero text/numbers)

### Design Principles
- **Modern & Clean**: Minimal, uncluttered interfaces
- **Energetic**: Vibrant green accents convey energy and motivation
- **Friendly**: Warm, approachable design that doesn't intimidate users
- **Mobile-First**: Optimized for iOS and Android mobile devices
- **Accessible**: High contrast, readable text, touch-friendly targets

---

## Screens to Redesign

Please create modern, polished designs for the following authentication screens:

### 1. **Welcome Screen** (Entry Point)
- First screen users see
- Should be inspiring and motivational
- Two main CTAs: "Sign Up" (primary) and "Log In" (secondary)

### 2. **Login Screen**
- Email/username input field
- Password input field (with show/hide toggle)
- "Forgot Password?" link
- "Log In" button (primary action)
- Option to navigate to Sign Up

### 3. **Signup Screen**
- Email input field
- Password input field (with strength indicator)
- Confirm password field
- Terms & conditions checkbox
- "Create Account" button (primary action)
- Option to navigate to Login

### 4. **Forgot Password Screen**
- Email input field
- "Send Reset Link" button
- Back to login link
- Clear messaging about what happens next

### 5. **Reset Password Screen** (via email link)
- New password input field
- Confirm password field
- "Reset Password" button
- Success state after completion

### 6. **Verify OTP Screen** (Email verification)
- 6-digit code input fields (individual boxes)
- "Resend Code" option
- Timer showing countdown
- "Verify" button

### 7. **Password Changed Success Screen**
- Success icon/illustration
- Confirmation message
- "Continue to Login" button

---

## Design Requirements

### Visual Style
- **Modern & Fresh**: Contemporary design with smooth animations
- **Gradient Backgrounds**: Subtle gradients using brand colors (light to darker green)
- **Card-Based Layout**: Input fields and forms in elevated cards with shadows
- **Smooth Animations**: Micro-interactions, subtle transitions (120Hz optimized)
- **Hero Elements**: Consider fitness-themed illustrations or abstract geometric shapes
- **Clean Typography**: Clear hierarchy with proper spacing

### Layout Guidelines
- **Mobile-First**: Optimized for phone screens (375px - 428px width)
- **Safe Areas**: Account for notches and bottom bars
- **Touch Targets**: Minimum 44x44pt for interactive elements
- **Spacing**: Generous whitespace (16-24px between elements)
- **Form Fields**: Rounded corners (12-16px radius), clear labels, helpful placeholders

### Color Usage
- **Primary Actions**: Use `#84c441` (brand green) for main buttons
- **Background**: `#FAFBFC` with subtle green gradients
- **Text**: `#1A1D21` for primary text, `#5A6570` for secondary
- **Error States**: `#EF5350` for validation errors
- **Success States**: `#84c441` for success messages

### Interactive Elements
- **Buttons**: 
  - Primary: Green background (`#84c441`), white text, rounded (20-24px)
  - Secondary: Transparent/gray background, green text/border
  - Loading states with spinners
- **Input Fields**:
  - Clean borders, focus states with green accent
  - Floating labels or clear placeholders
  - Error states with red border and message
- **Links**: Green color (`#84c441`), underline on hover/press

---

## Specific Enhancement Requests

### 1. Welcome Screen
- Create an inspiring hero section with motivational fitness messaging
- Use gradient backgrounds with brand colors
- Add subtle animations (fade-in, slide-up)
- Make CTAs prominent and energetic

### 2. Login/Signup Forms
- **Input Field Design**:
  - Modern, rounded fields with subtle shadows
  - Floating labels or clear placeholder text
  - Green focus indicators
  - Password strength meter (for signup)
  - Show/hide password toggle with eye icon
- **Button Design**:
  - Prominent, rounded primary buttons
  - Loading states
  - Disabled states (grayed out)
- **Error Handling**:
  - Inline error messages below fields
  - Red border on error fields
  - Clear, helpful error text

### 3. OTP Verification
- **Code Input Design**:
  - Individual digit boxes (6 boxes, side by side)
  - Auto-advance to next box on input
  - Paste support for full code
  - Focus indicator on active box
  - Green checkmark on valid entry

### 4. Password Reset Flow
- Clear step-by-step progress indication
- Helpful messaging at each step
- Success screens with confirmation icons
- Smooth transitions between screens

### 5. Overall UX Improvements
- **Onboarding Feel**: Make authentication feel like part of an inspiring journey
- **Visual Feedback**: Loading states, success animations, error animations
- **Accessibility**: High contrast, readable text sizes, clear hierarchy
- **Micro-interactions**: Button press animations, input focus states, smooth transitions

---

## Design Inspiration
- **Fitness Apps**: Strava, Nike Training Club, MyFitnessPal
- **Modern Auth UIs**: Stripe, Linear, Notion
- **Energy & Motivation**: Use vibrant colors but keep it clean and professional

---

## Deliverables Requested

Please provide:
1. **High-fidelity mockups** for all 7 screens
2. **Design specifications**:
   - Spacing (padding, margins)
   - Typography (font sizes, weights, line heights)
   - Colors (hex codes)
   - Border radius values
   - Shadow specifications
3. **Component variants**:
   - Default states
   - Focus/active states
   - Error states
   - Loading states
   - Disabled states
4. **Mobile layouts** for iOS and Android (consider safe areas)

---

## Technical Constraints
- **Platform**: React Native (iOS & Android)
- **Screen Sizes**: 375px - 428px width (iPhone sizes)
- **Fonts**: Montserrat Alternates family (Bold, SemiBold, Regular)
- **Animations**: Should be smooth, 60-120fps capable
- **Dark Mode**: Consider providing dark mode variants (optional)

---

## Success Criteria
The redesigned authentication flow should:
✅ Feel modern, professional, and trustworthy
✅ Be visually consistent with fitness/energy brand identity
✅ Provide clear visual hierarchy and user guidance
✅ Include helpful micro-interactions and feedback
✅ Be accessible and easy to use
✅ Inspire confidence and motivation in users
✅ Feel seamless and polished throughout the entire flow

---

## Additional Notes
- Keep forms simple and focused (don't overwhelm users)
- Use the brand green (`#84c441`) strategically for emphasis
- Ensure excellent readability and contrast
- Consider adding subtle fitness-themed visual elements (abstract shapes, geometric patterns)
- Make the experience feel premium and well-crafted

