# AcePlan - Comprehensive Project Documentation

**Application Name:** AcePlan – Study Management Platform  
**Version:** 1.0  
**Date:** February 2026  
**Tech Stack:** React 18 + TypeScript, Vite, Tailwind CSS, Supabase

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Application Architecture](#3-application-architecture)
4. [Database Schema](#4-database-schema)
5. [Authentication System](#5-authentication-system)
6. [Pages & Features](#6-pages--features)
7. [Edge Functions (Backend)](#7-edge-functions-backend)
8. [Gamification / Badge System](#8-gamification--badge-system)
9. [Security Implementation](#9-security-implementation)
10. [UI/UX Design System](#10-uiux-design-system)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Data Flow Diagrams](#12-data-flow-diagrams)

---

## 1. Project Overview

### What
AcePlan is a comprehensive study management web application that helps students organize their academic life in one centralized platform.

### Why
Students often struggle with:
- Scattered study resources across multiple tools
- No way to track study hours and build consistency
- Difficulty managing timetables, exams, and materials
- Lack of motivation without progress tracking

AcePlan solves all of these by combining study tracking, material management, timetable organization, exam tracking, and gamification into a single platform.

### Where
- **Landing Page:** `/` – Public marketing page
- **Authentication:** `/auth` – Sign in / Sign up
- **Dashboard:** `/dashboard` – Main user hub
- **Subject Detail:** `/subject/:id` – Materials per subject
- **My Subjects:** `/my-subjects` – Full subject management
- **Timetable:** `/timetable` – Weekly class schedule
- **Exams:** `/exams` – Exam tracking & GPA calculator
- **Statistics:** `/statistics` – Study analytics & charts
- **Profile:** `/profile` – User profile, certificates, badges

---

## 2. Technology Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend Framework** | React 18.3.1 + TypeScript | Component-based architecture with type safety |
| **Build Tool** | Vite | Fast HMR, native ESM, optimized production builds |
| **Styling** | Tailwind CSS + CSS Variables | Utility-first, design tokens, dark/light mode |
| **UI Components** | shadcn/ui (Radix UI primitives) | Accessible, customizable, headless components |
| **State Management** | TanStack React Query | Server state caching, auto-refetch, optimistic updates |
| **Routing** | React Router DOM v6 | Client-side routing with nested routes |
| **Form Handling** | React Hook Form + Zod | Performant forms with schema-based validation |
| **Charts** | Recharts | Declarative chart components (Bar, Pie, Line) |
| **Backend/Database** |  (Supabase/PostgreSQL) | Auth, database, storage, edge functions |
| **Email Service** | Resend | Transactional emails for OTP verification |
| **AI Integration** | Groq AI (GPT OpenAI) | Timetable image parsing |
| **Theme** | next-themes | System/dark/light mode support |
| **Notifications** | Sonner (toast) | User feedback toasts |

### Key Dependencies
- `date-fns` – Date manipulation and formatting
- `lucide-react` – Icon library
- `zod` – Runtime type validation
- `input-otp` – OTP input component
- `tailwindcss-animate` – Animation utilities

---

## 3. Application Architecture

### File Structure
```
src/
├── App.tsx                    # Root component, routing, providers
├── main.tsx                   # Entry point
├── index.css                  # Global styles, CSS variables, design tokens
├── pages/
│   ├── Index.tsx              # Landing/marketing page
│   ├── Auth.tsx               # Authentication (sign in/up, OTP, forgot password)
│   ├── Dashboard.tsx          # Main dashboard with timer & exams
│   ├── SubjectDetail.tsx      # Subject materials & folders
│   ├── MySubjects.tsx         # Subject CRUD & semester management
│   ├── Timetable.tsx          # Weekly schedule grid
│   ├── Exams.tsx              # Exam tracking, GPA, CGPA calculator
│   ├── Statistics.tsx         # Study analytics with charts
│   ├── Profile.tsx            # User profile, certificates, badges
│   └── NotFound.tsx           # 404 page
├── components/
│   ├── AppHeader.tsx          # Shared navigation header
│   ├── ThemeToggle.tsx        # Dark/light mode toggle
│   ├── StudyTimer.tsx         # Study session timer with auto-save
│   ├── UpcomingExams.tsx      # Upcoming exams widget
│   ├── SubjectCard.tsx        # Subject display card
│   ├── MaterialCard.tsx       # Study material card
│   ├── FolderView.tsx         # Folder with materials inside
│   ├── BadgeCard.tsx          # Achievement badge display
│   ├── CertificateCard.tsx    # Certificate display card
│   ├── AvatarEditorDialog.tsx # Profile picture cropper
│   ├── Add*Dialog.tsx         # Various "add" dialogs
│   ├── Edit*Dialog.tsx        # Various "edit" dialogs
│   ├── ClearTimetableDialog.tsx
│   ├── ManageSubjectsDialog.tsx
│   ├── UploadTimetableDialog.tsx
│   └── ui/                    # shadcn/ui base components
├── lib/
│   ├── utils.ts               # Utility functions (cn, formatTo12Hour)
│   └── badgeUtils.ts          # Badge logic and streak calculations
├── hooks/
│   ├── use-mobile.tsx         # Mobile detection hook
│   └── use-toast.ts           # Toast hook
├── integrations/supabase/
│   ├── client.ts              # Supabase client (auto-generated)
│   └── types.ts               # Database types (auto-generated)
└── assets/
    └── hero-image.jpg         # Landing page hero image

supabase/
├── config.toml                # Edge function configuration
├── functions/
│   ├── parse-timetable/       # AI timetable image parser
│   ├── generate-ai-notes/     # AI notes generation (streamed)
│   ├── refine-ai-notes/       # AI notes refinement (streamed)
│   ├── generate-ai-quiz/      # AI quiz generation
│   ├── grade-ai-quiz/         # Quiz grading
│   └── _shared/               # Shared helpers (CORS, input limits, signed-in check)
└── migrations/                # Database migration files
```

### Routing Configuration (App.tsx)

| Route | Component | Auth Required | Description |
|-------|-----------|---------------|-------------|
| `/` | Index | No | Landing page |
| `/auth` | Auth | No | Sign in / Sign up |
| `/dashboard` | Dashboard | Yes | Main hub |
| `/subject/:id` | SubjectDetail | Yes | Subject materials |
| `/my-subjects` | MySubjects | Yes | Subject management |
| `/timetable` | Timetable | Yes | Weekly schedule |
| `/exams` | Exams | Yes | Exam & GPA tracking |
| `/statistics` | Statistics | Yes | Study analytics |
| `/profile` | Profile | Yes | User profile |
| `*` | NotFound | No | 404 page |

### Provider Hierarchy
```
QueryClientProvider (TanStack React Query)
  └── ThemeProvider (next-themes)
      └── TooltipProvider
          ├── Toaster (shadcn)
          ├── Sonner (toast notifications)
          └── BrowserRouter (React Router)
              └── Routes
```

---

## 4. Database Schema

### Tables Overview

#### 4.1 `profiles`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Links to auth.users |
| email | TEXT | User's email |
| full_name | TEXT | Display name |
| username | TEXT (UNIQUE) | Unique nickname |
| avatar_url | TEXT | Profile picture URL |
| resume_url | TEXT | Resume file URL |
| age | INTEGER | Auto-calculated from birthday |
| birthday | DATE | Date of birth |
| profession | TEXT | Student/Undergraduate/Postgraduate/Masters/PhD |
| school_name | TEXT | School name |
| ug_college | TEXT | Undergraduate college |
| ug_course | TEXT | UG course name |
| pg_college | TEXT | Postgraduate college |
| pg_course | TEXT | PG course name |
| tenth_percentage | NUMERIC | 10th grade percentage |
| twelfth_percentage | NUMERIC | 12th grade percentage |
| current_cgpa | NUMERIC | Current CGPA (synced from Exams) |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

**How:** Auto-created via `handle_new_user()` trigger when user signs up. Updated via Profile page form.

#### 4.2 `subjects`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Subject identifier |
| user_id | UUID | Owner |
| name | TEXT | Subject name |
| color | TEXT | Hex color code (default: #3B82F6) |
| exam_date | DATE | Next exam date |
| semester | TEXT | e.g., "Semester 1" |
| teacher | TEXT | Instructor name |
| location | TEXT | Classroom/building |
| is_active | BOOLEAN | Active or archived (default: true) |

**How:** Created via AddSubjectDialog or AddSubjectWithDetailsDialog. Supports archiving (soft delete via is_active flag).

#### 4.3 `study_sessions`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Session identifier |
| user_id | UUID | Owner |
| subject_id | UUID (FK → subjects) | Which subject |
| duration | INTEGER | Duration in seconds |
| date | DATE | Session date |
| notes | TEXT | Session notes / auto-backup marker |

**How:** Created when StudyTimer is stopped. Auto-backed up every 5 minutes during active sessions. Duration stored in seconds for precision.

**Validation:** A database trigger (`validate_daily_study_time`) ensures total study time per user per day cannot exceed 24 hours (86,400 seconds).

#### 4.4 `study_materials`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Material identifier |
| user_id | UUID | Owner |
| subject_id | UUID (FK → subjects) | Parent subject |
| title | TEXT | Material title |
| type | TEXT | "pdf", "link", "notes" |
| content | TEXT | Note text content |
| url | TEXT | PDF URL or external link |
| folder | TEXT | Folder name (nullable) |

**How:** Created via AddMaterialDialog. PDFs uploaded to Supabase Storage bucket `study-materials`. Organized into folders.

#### 4.5 `folders`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Folder identifier |
| user_id | UUID | Owner |
| subject_id | UUID | Parent subject |
| name | TEXT | Folder name |
| color | TEXT | Hex color (default: #6366f1) |

**How:** Created via CreateFolderDialog. Materials can be moved between folders via drag-and-drop.

#### 4.6 `timetable_periods`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Period identifier |
| user_id | UUID | Owner |
| subject_id | UUID (FK → subjects) | Linked subject |
| day_of_week | INTEGER | 0=Sunday ... 6=Saturday |
| start_time | TIME | Period start (HH:MM) |
| end_time | TIME | Period end (HH:MM) |
| location | TEXT | Room/building |
| teacher | TEXT | Instructor |
| notes | TEXT | Additional notes |

**How:** Created manually via AddPeriodDialog or automatically via AI timetable image parsing. Displayed in a grid with row-spanning for multi-slot periods.

#### 4.7 `exams`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Exam identifier |
| user_id | UUID | Owner |
| title | TEXT | Exam name |
| exam_date | DATE | Exam date |
| score | NUMERIC | Score achieved (nullable) |

**How:** Created via AddExamDialog. Linked to subjects via exam_subjects junction table.

#### 4.8 `exam_subjects`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Link identifier |
| exam_id | UUID (FK → exams) | Parent exam |
| subject_id | UUID (FK → subjects) | Linked subject |
| topics | TEXT | Specific topics covered |

**How:** Created alongside exams. Supports many-to-many relationship between exams and subjects.

#### 4.9 `semester_gpas`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | GPA record identifier |
| user_id | UUID | Owner |
| semester | TEXT | e.g., "Semester 1" |
| gpa | NUMERIC | Semester GPA (0-10) |
| credits | INTEGER | Credit weight (optional) |

**How:** Managed on the Exams page. Supports weighted (with credits) or simple average CGPA calculation.

#### 4.10 `certificates`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Certificate identifier |
| user_id | UUID | Owner |
| title | TEXT | Certificate name |
| issuing_organization | TEXT | Issuing body |
| issue_date | DATE | Date issued |
| file_url | TEXT | Uploaded file URL |

**How:** Created on the Profile page via AddCertificateDialog. Files stored in Supabase Storage.

#### 4.11 `user_badges`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Badge record identifier |
| user_id | UUID | Owner |
| badge_type | ENUM | One of 11 badge types |
| earned_at | TIMESTAMPTZ | When badge was earned |

**How:** Automatically awarded by `badgeUtils.ts` when conditions are met (study sessions, streaks, profile completion).

#### 4.12 `ai_usage`
| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID (PK part) | The signed-in user |
| day | DATE (PK part) | Calendar day |
| used | INTEGER | AI calls counted for that user on that day |

**How:** Written only by the `consume_ai_quota` database function, which the AI edge functions call before spending AI credits (default limit 50 calls per user per day, set by `AI_DAILY_LIMIT`). Row level security is on with no policies, so nobody reads or writes it directly. The former `email_otps` table was dropped together with the custom one-time-code login.

### Database Functions & Triggers

| Function | Purpose |
|----------|---------|
| `handle_new_user()` | Auto-creates a profile row when a user signs up via auth |
| `update_updated_at_column()` | Updates `updated_at` timestamp on row modifications |
| `validate_daily_study_time()` | Prevents total daily study time from exceeding 24 hours |

---

## 5. Authentication System

### What
Multi-method authentication supporting email/password, Google OAuth, email OTP, and password reset.

### Where
`src/pages/Auth.tsx` – All authentication flows live here.

### How – Authentication Methods

#### 5.1 Email/Password Sign Up
1. User enters email, password (min 6 chars)
2. Zod validates input
3. `supabase.auth.signUp()` creates account
4. `handle_new_user()` trigger creates profile row
5. User signs in with credentials

#### 5.2 Email/Password Sign In
1. User enters credentials
2. `supabase.auth.signInWithPassword()` authenticates
3. JWT token stored in localStorage
4. `onAuthStateChange` listener redirects to `/dashboard`

#### 5.3 and 5.4 Email one-time-code sign up and sign in (removed)
The custom email one-time-code login (the `send-otp` and `verify-otp` functions and the `email_otps` table) was removed. Sign-up and sign-in use only Supabase's built-in email and password and Google (see `docs/DECISIONS.md` D2). One-time email codes can return later through Supabase's built-in service once a custom email sender exists.

#### 5.5 Google OAuth
1. `supabase.auth.signInWithOAuth({ provider: 'google' })` redirects to Google
2. Google authenticates and redirects back
3. `onAuthStateChange` detects session and navigates to dashboard

#### 5.6 Forgot Password
1. User enters email
2. `supabase.auth.resetPasswordForEmail()` sends reset link
3. User clicks link and resets password

### Session Management
- JWT tokens persisted in `localStorage`
- `autoRefreshToken: true` keeps sessions alive
- `onAuthStateChange` listener set up BEFORE `getSession()` call
- Every protected page checks session and redirects to `/auth` if missing

---

## 6. Pages & Features

### 6.1 Landing Page (`/` – Index.tsx)

**What:** Public marketing page with hero section, feature showcase, and CTA.

**Features:**
- Animated hero section with gradient text
- Feature cards (Organize Subjects, Track Exams, Manage Materials, Study Timer)
- Floating stat cards with animations
- CTA section with gradient background
- Responsive design with mobile-first approach
- Theme toggle in navigation

**How:** Pure presentational React component with Tailwind styling. Uses `framer-motion`-style CSS animations via `tailwindcss-animate`.

### 6.2 Dashboard (`/dashboard` – Dashboard.tsx)

**What:** Main hub displaying subjects, study timer, and upcoming exams.

**Features:**
- Welcome message
- **Upcoming Exams widget** – Shows exams with countdown (days until), subject color dots, topics, and score if available
- **Study Timer** – Select subject, start/pause/stop with auto-backup
- **Subject grid** – Color-coded subject cards linking to detail pages
- Add Subject button
- Full navigation header (AppHeader)

**How:** Fetches subjects from Supabase on mount. Passes subjects to child components. Uses `refreshTrigger` state to sync UpcomingExams after subject changes.

### 6.3 Study Timer (`StudyTimer.tsx`)

**What:** A real-time study session timer with persistence and auto-backup.

**Where:** Embedded in Dashboard page.

**Features:**
- Subject selector (locked during active session)
- Start / Pause / Save & Reset controls
- Real-time HH:MM:SS display
- **Persistence:** Timer state saved to `localStorage` – survives page refresh/browser close
- **Auto-backup:** Every 5 minutes, saves progress to database as `[IN PROGRESS]` session
- **Final save:** On stop, updates backup session or creates new one with final duration
- **Badge checking:** After save, checks and awards study session badges

**How:**
1. On start: Stores `{ startTime, subjectId, lastSave, sessionId }` in localStorage
2. Every second: Recalculates elapsed time from `startTime` (prevents drift)
3. Every minute: Checks if 5 minutes passed since last auto-save; if so, upserts to `study_sessions`
4. On stop: Saves final duration, removes localStorage, triggers badge check
5. On mount: Restores timer from localStorage if previously active

### 6.4 Subject Management (`/my-subjects` – MySubjects.tsx)

**What:** Full CRUD management for subjects with semester organization.

**Features:**
- **Tabs:** Active / Past/Archived
- **Semester filter** dropdown
- Subject cards showing name, color, teacher, location, exam date, semester badge
- **Actions:** Edit, Archive/Restore, Delete (with confirmation dialog)
- **Add Subject** with full details (name, color, teacher, location, semester, exam date)
- Grouped display by semester for archived subjects

**How:** Fetches all subjects (both active and archived). Archive toggles `is_active` boolean. Delete permanently removes from database.

### 6.5 Subject Detail (`/subject/:id` – SubjectDetail.tsx)

**What:** Study materials management for a specific subject, organized into folders.

**Features:**
- Subject header with color indicator and exam date
- **Folder system:** Create folders with custom colors, rename, delete
- **Materials:** Add PDFs (upload to storage), external links, and text notes
- **Drag and drop:** Move materials between folders
- Material cards with type icons (PDF, Link, Notes, Video)
- Edit and delete materials

**How:** Fetches subject, materials, and folders in parallel. Materials linked to folders via `folder` text field. PDFs uploaded to Supabase Storage bucket `study-materials`.

### 6.6 Timetable (`/timetable` – Timetable.tsx)

**What:** Interactive weekly class schedule grid.

**Features:**
- **Grid view:** Time slots as rows, days as columns
- **Dynamic time slots:** Generated from actual period data (not fixed)
- **Row spanning:** Multi-slot periods merge cells vertically
- **Period cards:** Show subject name, time range, location with subject color
- **Click to edit:** Clicking a period opens EditPeriodDialog
- **Add Period:** Manual entry with subject, day, start/end time, location, teacher
- **AI Upload:** Upload timetable image for automatic parsing (see Edge Functions)
- **Print:** Opens print-formatted view in new window
- **Clear Timetable:** Delete all periods with confirmation
- **Manage Subjects:** Quick access to subject management
- **Responsive:** Abbreviated day names on mobile, horizontal scroll

**How:**
1. Fetches periods with joined subject data
2. `generateTimeSlots()` extracts unique start times from periods
3. `getPeriodForSlot()` finds matching period for each cell
4. `getRowSpan()` calculates how many rows a period spans
5. `isPeriodSpanning()` determines if a cell should be hidden (spanned by above)
6. `formatTo12Hour()` converts 24h time to 12h format

### 6.7 Exams & GPA (`/exams` – Exams.tsx)

**What:** Comprehensive exam tracking with GPA/CGPA calculator and analytics.

**Features:**
- **Tabs:** Upcoming Exams | Past Exams | Statistics | GPA Tracker
- **Semester filter** across all tabs
- **Exam cards:** Title, date, subjects with color dots, topics, score, edit button
- **Statistics tab:**
  - Average/highest/lowest scores
  - Bar chart of scores over time
  - Pie chart of subject distribution
  - Score trend line chart
- **GPA Tracker tab:**
  - Per-semester GPA entry with optional credit weights
  - Add new semesters
  - CGPA calculation (weighted if credits provided, simple average otherwise)
  - Manual CGPA override option
  - **Target GPA Calculator:** Enter target CGPA + next semester credits → calculates required GPA
  - CGPA trend line chart across semesters
  - Auto-sync CGPA to profile

**How:**
- CGPA formula (weighted): `Σ(GPA × credits) / Σ(credits)`
- CGPA formula (simple): `Σ(GPA) / count`
- Target GPA: `required = (target × (totalCredits + nextCredits) - currentTotal) / nextCredits`
- CGPA synced to `profiles.current_cgpa` on every semester GPA change

### 6.8 Statistics (`/statistics` – Statistics.tsx)

**What:** Visual study analytics with multiple time views.

**Features:**
- **Views:** Daily | Weekly | Monthly | Subject-wise
- **Semester filter**
- **Total study time** card for selected view
- **Daily:** Bar chart (minutes per subject today) + Pie chart (distribution)
- **Weekly:** Bar chart (minutes per day this week, Sun-Sat)
- **Monthly:** Bar chart (minutes per week this month)
- **Subject:** Horizontal bar chart (total minutes per subject) + Pie chart
- Subject summary cards with total hours and color indicators

**How:**
- Fetches all `study_sessions` and `subjects` for user
- Filters out auto-saved sessions (notes starting with "Auto-saved session")
- Aggregates durations by time period using `date-fns` utilities
- Converts seconds → minutes for chart display
- Uses Recharts `BarChart`, `PieChart` with `ChartContainer` wrapper

### 6.9 Profile (`/profile` – Profile.tsx)

**What:** User profile management with academic records, certificates, and badges.

**Features:**
- **Avatar:** Upload with crop/edit dialog, stored in Supabase Storage
- **Personal info:** Name, nickname (unique), email (read-only), birthday (auto-calculates age), profession
- **Academic records:** School name, 10th/12th percentage, UG/PG college & course, CGPA (auto-calculated)
- **Resume upload:** PDF upload to storage
- **Certificates section:** Add/view certificates with file uploads
- **Badges section:** Display all earned badges with earned dates, unearned badges shown as locked
- **Profile complete badge:** Awarded when all required fields are filled

**How:**
- CGPA pulled from `semester_gpas` table (same calculation as Exams page)
- Avatar: Upload → crop via AvatarEditorDialog → save blob to storage → update profile URL
- Resume: Direct file upload to storage → update profile URL
- Badge check runs after profile save

---

## 7. Edge Functions (Backend)

### 7.1 `parse-timetable`

**What:** AI-powered timetable image parser.

**Where:** `supabase/functions/parse-timetable/index.ts`

**Why:** Manually entering every class period is tedious. This lets students upload a photo of their timetable.

**How:**
1. Receives: `imageBase64`, `additionalContext`, `existingSubjects`
2. Constructs prompt asking AI to extract periods (subject, day, time, location, teacher)
3. If existing subjects provided, instructs AI to match abbreviations (e.g., "CN" → "Computer Networks")
4. Calls Groq with a vision-capable model (`GROQ_VISION_MODEL`) and the image + prompt
5. Parses JSON array from AI response using regex match
6. Returns extracted periods array
7. Frontend then matches/creates subjects and inserts into `timetable_periods`

**Config:** `verify_jwt = false` on purpose; the function checks for a signed-in user itself (see 7.3).

### 7.2 `generate-ai-notes`, `refine-ai-notes`, `generate-ai-quiz`, `grade-ai-quiz`

**What:** The AI notes and quiz functions. They call Groq with `GROQ_TEXT_MODEL` (default `llama-3.3-70b-versatile`).

**Where:** `supabase/functions/<name>/index.ts`

**How:** Notes generation and refinement stream the model's answer back to the browser. Quiz generation returns JSON questions. Grading checks multiple-choice answers inside the function and asks the AI to grade written answers.

### 7.3 Checks every AI function makes

Shared code lives in `supabase/functions/_shared/`.
1. **CORS allowlist:** only origins listed in the `ALLOWED_ORIGINS` secret are answered.
2. **Signed-in user:** the caller's token must belong to a real user (`requireUser`); the public anon key is refused.
3. **Input size limits:** oversized or missing input is rejected before any AI cost.
4. **Daily limit:** the `consume_ai_quota` database function counts each AI call per user per day (`AI_DAILY_LIMIT`, default 50).
5. **Generic errors:** callers get a fixed message; details go to the function logs only.

**Removed:** the earlier `send-otp` and `verify-otp` functions (custom email one-time-code login) no longer exist; see section 5.

---

## 8. Gamification / Badge System

### What
An achievement system with 11 badges to motivate consistent study habits.

### Where
- Logic: `src/lib/badgeUtils.ts`
- Display: `src/components/BadgeCard.tsx` (on Profile page)
- Database: `user_badges` table

### Badge Types

| Badge | Type | Trigger | Icon |
|-------|------|---------|------|
| First Steps | `first_study_session` | Complete any study session | 🎯 |
| Exam Ready | `first_exam` | Add first exam | 📝 |
| Subject Master | `first_subject` | Add first subject | 📚 |
| Profile Pro | `profile_complete` | Fill all required profile fields | 👤 |
| Hour Hero | `study_1_hour` | Complete a 1-hour session | ⏰ |
| Marathon Mind | `study_3_hours` | Complete a 3-hour session | 🏃 |
| Study Champion | `study_6_hours` | Complete a 6-hour session | 🏆 |
| 3-Day Streak | `study_streak_3` | Study 3 consecutive days | 🔥 |
| Week Warrior | `study_streak_7` | Study 7 consecutive days | ⭐ |
| Fortnight Fighter | `study_streak_15` | Study 15 consecutive days | 💪 |
| Month Master | `study_streak_30` | Study 30 consecutive days | 👑 |

### How – Streak Calculation
1. Fetch all `study_sessions` dates for user
2. Get unique dates, sort descending
3. Starting from today (or yesterday if no session today), count consecutive days
4. Award highest applicable streak badge

### How – Badge Award Flow
1. `checkAndAwardBadge()` checks if badge already exists
2. If not, inserts into `user_badges`
3. Shows toast notification: "🎉 Badge Unlocked: [icon] [name]!"

### Profile Complete Badge
Required fields: `full_name`, `username`, `birthday`, `profession`, `school_name`. Checked after every profile save.

---

## 9. Security Implementation

### Row Level Security (RLS)
Every table has RLS enabled with policies ensuring users can only access their own data:

```sql
-- Standard pattern for all user-owned tables:
CREATE POLICY "Users can view own [table]" ON public.[table]
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own [table]" ON public.[table]
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own [table]" ON public.[table]
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own [table]" ON public.[table]
  FOR DELETE USING (auth.uid() = user_id);
```

**Special cases:**
- `profiles`: Uses `auth.uid() = id` (id IS the user_id). No DELETE policy.
- `user_badges`: No UPDATE or DELETE policies (badges are permanent).
- `exam_subjects`: Policies check ownership via JOIN to `exams` table.
- `ai_usage`: RLS is on with no policies; only the `consume_ai_quota` function writes it.

### Input Validation
- **Client-side:** Zod schemas validate email format, password length, name length
- **Database:** `validate_daily_study_time` trigger prevents >24h/day
- **Edge functions:** Input validation before processing

### Authentication Security
- JWT tokens with auto-refresh
- Service role key only used in edge functions (never exposed to client)
- OTPs expire after 10 minutes
- Old OTPs deleted when new one is requested

---

## 10. UI/UX Design System

### Theme Architecture
- CSS custom properties defined in `index.css`
- HSL color format for all tokens
- Semantic tokens: `--background`, `--foreground`, `--primary`, `--muted`, `--accent`, `--destructive`, etc.
- Dark mode support via `next-themes` with class-based toggling
- All components use Tailwind classes referencing tokens (e.g., `bg-primary`, `text-muted-foreground`)

### Component Library
Built on **shadcn/ui** (Radix UI primitives):
- Dialog, AlertDialog, Sheet (modals)
- Button, Input, Label, Select, Checkbox, RadioGroup
- Card, Badge, Avatar, Separator
- Tabs, Accordion, Collapsible
- Toast (Sonner), Tooltip, Popover
- Chart (Recharts wrapper)

### Responsive Design
- Mobile-first with `sm:`, `md:`, `lg:` breakpoints
- Navigation: Icons only on mobile, icons + labels on desktop
- Grids: 1 column → 2 columns → 3 columns
- Dialogs adapt to screen size
- Timetable: Horizontal scroll on mobile with abbreviated day names

### Animations
- `animate-fade-in` for page elements
- `animate-float` for floating cards on landing page
- `animate-pulse` for loading states
- `animate-scale-in` for badges and chips
- Hover transitions on cards and buttons

---

## 11. Deployment & Infrastructure

### Frontend
- Built with Vite (optimized production bundle)
- Hosted on CDN for global distribution
- Single JavaScript bundle today (no route-level code splitting yet; planned)

### Backend 
- **Database:** PostgreSQL with connection pooling
- **Auth:** Built-in email/password + OAuth providers
- **Storage:** `study-materials` bucket (public) for avatars, PDFs, resumes, certificates
- **Edge Functions:** Deno-based serverless functions, auto-deployed on code change
- **Secrets:** `RESEND_API_KEY`, `GROQ_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` managed securely

### Environment Variables
| Variable | Purpose |
|----------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL (client-side) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key for client (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key (edge functions only) |
| `RESEND_API_KEY` | Email sending service |
| `GROQ_API_KEY` | Groq API key used by the AI edge functions (set as a Supabase secret) |

---

## 12. Data Flow Diagrams

### Study Session Flow
```
User selects subject → Clicks Start
    ↓
Timer starts (localStorage: { startTime, subjectId })
    ↓
Every second: Recalculate elapsed from startTime
    ↓
Every 5 minutes: Auto-save to study_sessions (backup)
    ↓
User clicks Save & Reset
    ↓
Final duration saved to study_sessions
    ↓
Badge check runs (duration + streak)
    ↓
Toast notification if badge earned
```

### Email and Password Sign Up Flow
```
User enters name, email and password → Frontend calls supabase.auth.signUp (name saved as user metadata)
    ↓
Database trigger handle_new_user creates the profile row
    ↓
Email confirmation off: a session is returned and the user goes to the dashboard
Email confirmation on: the user must click the link in the email first
```

### AI Timetable Parsing Flow
```
User uploads timetable image → Frontend converts to base64
    ↓
Frontend calls parse-timetable edge function with:
  - imageBase64
  - existingSubjects (for name matching)
  - additionalContext (user hints)
    ↓
Edge function: Calls Groq AI (GPT OpenAI) with image + prompt
    ↓
AI extracts periods: [{ subject, day, start_time, end_time, location, teacher }]
    ↓
Frontend receives parsed periods
    ↓
For each period:
  - Match to existing subject OR create new subject
  - Insert into timetable_periods
    ↓
Timetable grid refreshes with new data
```

### CGPA Sync Flow
```
User edits semester GPA on Exams page
    ↓
Save to semester_gpas table
    ↓
calculateCGPA() runs (weighted or simple average)
    ↓
syncCGPAToProfile() updates profiles.current_cgpa
    ↓
Profile page reads synced CGPA value
```

---

## Quick Reference Stats

| Metric | Value |
|--------|-------|
| Frontend Framework | React 18.3.1 + TypeScript |
| Backend | (PostgreSQL + Edge Functions) |
| UI Library | shadcn/ui (Radix UI) |
| Database Tables | 12 |
| Edge Functions | 5 (parse-timetable, generate-ai-notes, refine-ai-notes, generate-ai-quiz, grade-ai-quiz) |
| Authentication Methods | 4 (Email/Password, Google OAuth, Email OTP, Magic Link) |
| Badge Types | 11 |
| Chart Library | Recharts |
| State Management | TanStack React Query + React useState |
| Total Pages | 9 (+ NotFound) |
| Storage Buckets | 1 (study-materials) |

---

*Document generated for AcePlan v1.0 – February 2026*
