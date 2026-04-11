# Product Requirements Document (PRD)
## The Productivity App

**Status**: Active Development  
**Document Version**: 1.0  

### 1. Product Overview
The platform is a multi-tier, full-stack productivity and habits-tracking application designed to help users set structured goals, execute focused work sessions, log comprehensive journal entries, and track failures purely for growth and accountability. 

With an architectural emphasis on local-first data caching synced with a robust backend service, the application ensures high performance and offline-resilience for web clients. The application serves users who require deep organizational hierarchy for their goals, combined with actionable session-tracking mechanics.

### 2. Core Modules & Interactions

#### 2.1 Goals Management
A highly structured OKR-like system allowing users to define exactly what they want to achieve and measure it systematically.
- **Hierarchical Goals**: Goals can be independent or parent-child nested.
- **Time Periods**: Scoped intrinsically to Yearly, Monthly, Weekly, or Daily time bounds.
- **Categories**: Tagged natively by life sectors: Spirituality, Finance, Health, and Relations.
- **Statuses**: Active, Done, Not Done, or Skipped.
- **Frameworks**: Goals are linked to customizable frameworks (e.g., dynamic key-value schemas) giving structured context.
- **Progress Tracking**: Automatic 0-100% completion rates calculated server-side based on session metrics and child-goals. 

#### 2.2 Deep Focus Sessions
A built-in pomodoro-style execution environment. Users don't just set goals; they enter sessions to work on them.
- **Timer Mechanics**: Custom work and rest intervals.
- **Session Types & Framework Data**: Records specific methodology data per session based on linked Frameworks.
- **Outcomes Tracking**: At the end of a session, users must log if the goal was achieved. If not, they document *Mistakes* and *Improvement Suggestions*.
- **Hard Single-Session Limits**: Prevents multi-tasking by enforcing a strict global "Active Session" singleton. 

#### 2.3 Journaling
A structured reflection module encouraging consistent daily, weekly, monthly, and yearly reviews.
- **Scope Context**: Can be tied to specific categories or specific goals.
- **Life vs Goal Journals**: 
  - *Life Journals*: Tracks learning, mistakes, emotions (and origins), and problem-solving.
  - *Goal Journals*: Highly specific reflection on a single goal's momentum.

#### 2.4 Failure Tracking
Normalizing failure by elevating it to a first-class feature.
- Users can log explicit "Failures" against a Session, a Goal, or general App/Life usage.
- Used to keep a running ledger of what isn't working to inform the "Improvement Suggestions" loop.
- Simple, swift capture meant to reduce the friction of documenting losses.

#### 2.5 Analytics & Dashboard
A comprehensive bird's-eye view.
- **Trend Charts**: Using Chart.js/Recharts to visualize completion rates and session consistency over time.
- Overview of active vs failing metrics across categories.

#### 2.6 Data Recovery (Trash)
- Soft-delete architecture.
- Any deleted item (Sessions, Goals, Journals, Failures) goes to the "Trash" module, capable of being permanently destroyed or restored, preventing accidental data loss.

### 3. Technical Architecture & Tech Stack

**Frontend (Client)**
- **Framework**: React 19 + TypeScript.
- **Build Tool**: Vite.
- **State Management**: Zustand (Global Store slices for each domain: Goals, Sessions, Journals, etc.).
- **Styling**: Tailwind CSS v4, utilizing Framer Motion for premium micro-interactions.
- **Local Database (Local-first caching)**: Dexie.js (IndexedDB wrapper) to ensure lightning-fast UI responses and caching prior to backend synchronization.

**Backend (API)**
- **Framework**: Node.js + Express + TypeScript.
- **Database**: SQLite (via `better-sqlite3`) for robust, localized, file-based persistence. 
- **Authentication**: Firebase Admin SDK (Supports a fallback `AUTH_ENABLED=false` local mode).
- **Core Loop**: Stateless REST endpoints that process CRUD and calculate cascading hierarchical goal progress.

### 4. User Journeys
1. **The Setup Flow**: User opens the app → Creates a custom Framework → Generates a Yearly Finance Goal → Breaks it down into Monthly child-goals.
2. **The Execution Flow**: User selects a Daily Goal → Starts a "Session" → Timer counts down → Upon finish, app explicitly asks: *"Did you achieve your goal?"* → User logs *No*, writes a mistake and an improvement → App logs a Failure automatically. 
3. **The Reflection Flow**: End of the week → User opens Journaling → Selects "Weekly Review" → App pulls their failures and goals to aid in their reflection → User creates an action plan for the next week.

### 5. Future Roadmap Considerations
- Granular sub-task checklist per active session.
- Advanced AI integration to synthesize weekly journal reflections and suggest goal restructuring based on failure frequency.
- Mobile-first PWA optimizations. 
- Expanded social accountability (sharing progress graphs).
