# TimeFlow - Time Manager App

A comprehensive productivity and time management application built with Next.js 14+, TypeScript, Tailwind CSS, and shadcn/ui.

![TimeFlow](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

### 📊 Dashboard
- Overview of all productivity metrics
- Quick access to tasks, reminders, and habits
- Real-time statistics and progress tracking

### ✅ Task Management
- Create, read, update, and delete tasks
- Task status: To-Do, In Progress, Done
- Priority levels: Low, Medium, High
- Deadline tracking

### 🔔 Reminders
- Set reminders with due dates and times
- Mark reminders as complete
- Notification system

### 📝 Notes
- Markdown-enabled note editor
- Search and tag functionality
- Pin important notes
- Live markdown preview

### 🎯 Goals & Aims
- Long-term goal tracking
- Milestone management
- Progress visualization with progress bars
- Target date tracking

### 📈 Habit Tracker
- Daily and weekly habit tracking
- Streak tracking and analytics
- Visual calendar view
- Longest streak records

### ⏱️ Time Tracking
- Start/stop timer functionality
- Categorize time entries
- Daily and weekly summaries
- Time analytics by category

### 📅 Timeline
- Daily activity timeline
- View all tasks, reminders, and events
- Chronological activity feed

### 📊 Analytics
- Interactive charts and graphs (Recharts)
- Task completion rates
- Goal progress visualization
- Habit consistency tracking
- Time spent per category

### 🔐 Authentication
- Login and registration pages
- Demo mode with localStorage persistence
- User profile management

### 🎨 Additional Features
- Dark/Light/System theme toggle
- Responsive design (mobile, tablet, desktop)
- Smooth animations with Framer Motion
- Data export functionality
- Clean, modern UI inspired by Notion and Linear

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd habit-react
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Demo Login
You can use any email and password to login in demo mode. The app uses localStorage for data persistence.

## 🏗️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **Markdown**: react-markdown + remark-gfm
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Date Handling**: date-fns

## 📁 Project Structure

```
habit-react/
├── app/                      # Next.js App Router pages
│   ├── analytics/           # Analytics dashboard
│   ├── auth/                # Authentication pages
│   ├── dashboard/           # Main dashboard
│   ├── goals/               # Goals management
│   ├── habits/              # Habit tracker
│   ├── notes/               # Notes with markdown
│   ├── reminders/           # Reminders
│   ├── settings/            # Settings page
│   ├── tasks/               # Task management
│   ├── time-tracking/       # Time tracking
│   ├── timeline/            # Activity timeline
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── layout/              # Layout components
│   ├── providers/           # Context providers
│   └── ui/                  # shadcn/ui components
├── lib/                     # Utilities and helpers
│   ├── store.ts             # Zustand store
│   ├── mock-data.ts         # Sample data
│   └── utils.ts             # Utility functions
└── types/                   # TypeScript type definitions
    └── index.ts             # Global types
```

## 🎯 Key Features Explained

### State Management
The app uses Zustand with localStorage persistence for state management. All data is stored locally in the browser.

### Theme System
Supports three theme modes:
- Light mode
- Dark mode
- System (follows OS preference)

### Data Export
Users can export all their data as JSON from the Settings page.

### Responsive Design
Fully responsive with:
- Mobile-first approach
- Collapsible sidebar on mobile
- Touch-friendly interactions

## 🔧 Available Scripts

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## 🎨 Customization

### Changing Theme Colors
Edit `app/globals.css` to customize the color scheme.

### Adding New Features
1. Create types in `types/index.ts`
2. Add state management in `lib/store.ts`
3. Create UI components in `components/`
4. Add pages in `app/`

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 👨‍💻 Author

Built with ❤️ using Next.js and TypeScript

---

**Note**: This is a demo application using localStorage for data persistence. For production use, integrate with a backend service like Firebase, Supabase, or a custom API.
