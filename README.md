# 🎓 AcePlan  
### AI-Powered Study Management System

AcePlan is a full-stack AI-integrated study management platform that centralizes academic organization, tracks productivity, and generates intelligent study notes.

Built with a modern React + TypeScript stack and powered by AI, AcePlan transforms fragmented academic workflows into a structured, data-driven system.

---

## 🚀 Features

### 🔐 Authentication & Profiles
- Email/password authentication (Supabase Auth)
- Auto-created profile via database trigger
- Academic details (CGPA, school, UG/PG, percentages, profession)
- Resume upload
- Custom avatar editor

---

### 📊 Dashboard
- Subject overview
- Quick access to Study Timer
- Upcoming exams widget
- Color-coded subject cards

---

### ⏱ Study Timer
- Real-time session tracking (second-by-second)
- Subject-based logging
- Auto-saves to `study_sessions`
- Triggers badge logic after each session

---

### 📚 Subject Management
- Create / edit / deactivate subjects
- Track teacher, semester, exam date, location
- Dedicated subject detail pages
- Linked materials and sessions

---

### 📅 Smart Timetable
- Weekly grid interface
- Full CRUD for periods
- AI-powered timetable parsing (image → structured schedule)
- Clear timetable functionality

---

### 📁 Study Materials & Folders
Supports:
- 📄 PDF (cloud storage)
- 🔗 Links
- 📝 Notes (text-based)

Features:
- Folder organization
- Subject filtering
- Full CRUD support

---

### 🧠 AI-Generated Notes

Multi-step workflow:
1. Attach material (text / PDF / DOCX / PPTX)
2. Choose detail level:
   - Brief (4–5K chars)
   - Standard (7–8K chars)
   - Comprehensive (10–12K chars)
3. Add custom instructions
4. Generate structured textbook-style notes

Advanced capabilities:
- TipTap rich text editor
- Auto-save
- AI refinement (follow-up prompts)
- Export to:
  - PDF
  - DOCX
  - Markdown

Powered via Edge Functions using Google Gemini.

---

### 📊 Statistics Dashboard
- Study time aggregation
- Daily / Weekly / Monthly filters
- Bar charts (Recharts)
- Subject-based hour breakdown

---

### 🏅 Achievement System
11 auto-awarded badges including:
- First study session
- First subject
- Profile completion
- Study milestones (1h, 3h, 6h)
- Study streaks (3, 7, 15, 30 days)

---

### 🎓 GPA Tracker
- Semester GPA entries
- Credit-based calculations
- CGPA stored in profile

---

### 📜 Certificates
- Academic certificate storage
- Issuing organization + issue date
- Optional file upload

---

### 🌙 Theming & UI
- Dark/Light mode toggle
- Persistent theme (next-themes)
- Mobile-first responsive design
- Built using Tailwind + shadcn/ui

---

# 🛠 Tech Stack

## Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui (Radix UI)
- React Router DOM v6
- TanStack React Query
- React Hook Form + Zod
- Recharts
- TipTap
- Sonner
- marked + Turndown

## Backend
- Supabase 
  - PostgreSQL
  - Authentication
  - Storage
  - Row Level Security (RLS)
  - Edge Functions

## AI
- Groq (llama models for notes, quizzes and grading; a vision model for timetable images), called only from Edge Functions

---

# 🗄 Database Schema

**Tables (14):**
- profiles
- subjects
- study_sessions
- study_materials
- folders
- timetable_periods
- exams
- exam_subjects
- certificates
- user_badges
- ai_notes
- semester_gpas
- quiz_attempts
- ai_usage

All tables protected using Row Level Security (RLS).

---

# ⚡ Edge Functions

| Function | Purpose |
|----------|----------|
| generate-ai-notes | AI note generation |
| refine-ai-notes | AI note refinement |
| parse-timetable | Image → timetable extraction |
| generate-ai-quiz | AI quiz generation |
| grade-ai-quiz | Quiz grading (written answers graded by AI) |

The AI functions only serve signed-in users and enforce a per-user daily limit.

---

# 🧱 Architecture

```
React (Frontend)
        ↓
React Query
        ↓
Supabase Client
        ↓
PostgreSQL + Storage + Auth
        ↓
Edge Functions
        ↓
Google Gemini
```

---

# 📂 Project Structure

```
src/
 ├── components/
 ├── pages/
 ├── hooks/
 ├── integrations/supabase/
 ├── lib/
 ├── types/
 └── utils/
```

---

# 🔒 Security

- Supabase Authentication
- Row Level Security (RLS) on all tables
- Secure file storage
- Edge Functions isolated from frontend

---

# ⚙️ Local Setup

```bash
# Clone repository
git clone <your-repo-url>

# Install dependencies
npm install

# Start development server
npm run dev
```

Use Node 24 (`.nvmrc`). Create a `.env` file in the project root with your Supabase
project values (Supabase dashboard, Project Settings, API):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

The anon key is public by design. Edge function secrets such as `GROQ_API_KEY` are set
on the Supabase project, not in `.env`. Full backend setup: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

## Checks

```bash
npm run lint:ci    # eslint, warnings may not grow past the recorded ceiling
npm run typecheck  # tsc on the app project
npm test           # vitest
npm run build      # production build
```

These four run in CI on every pull request and push to `main`, together with a
from-scratch replay of the database migrations (`supabase/ci/replay.sh`).

---

# 📈 Future Roadmap

- AI Quiz Generator
- Smart Study Plan Generator
- Performance-based study recommendations
- Collaboration mode
- SaaS deployment

---

# 👨‍💻 Author

**Pranav Upadhyay**  
AI-Focused Study Productivity Platform

---

# 📄 License

This project is proprietary unless otherwise specified.