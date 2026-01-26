# TimeFlow - Usage Guide

## Quick Start

### 1. First Time Setup

After installation, start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the landing page.

### 2. Getting Started

1. Click **"Get Started"** or **"Login"** on the landing page
2. Enter any email and password (demo mode - no real authentication)
3. You'll be redirected to the Dashboard

### 3. Exploring the Dashboard

The Dashboard provides an overview of:
- **Total Tasks** - with completion rate
- **Active Goals** - number of goals on track
- **Habit Streak** - your longest current streak
- **Time Today** - total time tracked today

Quick access cards show:
- Today's Tasks
- Upcoming Reminders
- Active Goals
- Today's Habits

## Module Guides

### 📋 Tasks

**Creating a Task:**
1. Navigate to Tasks from the sidebar
2. Click **"New Task"**
3. Fill in:
   - Title (required)
   - Description (optional)
   - Status: To-Do, In Progress, or Done
   - Priority: Low, Medium, or High
   - Deadline (optional)
4. Click **"Create Task"**

**Managing Tasks:**
- Use tabs to filter by status (All, To-Do, In Progress, Done)
- Click the edit icon to modify a task
- Click the trash icon to delete a task
- Tasks show priority badges and deadlines

### 🔔 Reminders

**Creating a Reminder:**
1. Go to Reminders
2. Click **"New Reminder"**
3. Enter:
   - Title
   - Description (optional)
   - Due Date & Time
4. Click **"Create Reminder"**

**Using Reminders:**
- Check the checkbox to mark as complete
- Completed reminders appear with reduced opacity
- Reminders are sorted by due date
- Delete reminders you no longer need

### 📝 Notes

**Creating a Note:**
1. Navigate to Notes
2. Click **"New Note"**
3. Write your note in Markdown format
4. Add tags (comma-separated)
5. Toggle **"Preview"** to see formatted output
6. Click **"Create Note"**

**Markdown Features:**
- Headers: `# H1`, `## H2`, etc.
- Bold: `**text**`
- Italic: `*text*`
- Lists: `- item` or `1. item`
- Links: `[text](url)`
- Code: `` `code` ``

**Managing Notes:**
- Use the search bar to find notes
- Click the pin icon to pin important notes
- Pinned notes appear at the top
- Edit or delete notes using the action buttons

### 🎯 Goals

**Creating a Goal:**
1. Go to Goals
2. Click **"New Goal"**
3. Fill in:
   - Title
   - Description
   - Target Date (optional)
   - Initial Progress (0-100%)
4. Add Milestones:
   - Type milestone title
   - Click **"Add"**
   - Repeat for all milestones
5. Click **"Create Goal"**

**Tracking Progress:**
- Check off milestones as you complete them
- Progress bar updates automatically based on completed milestones
- Manually adjust progress slider if needed
- View target date to stay on track

### 📈 Habits

**Creating a Habit:**
1. Navigate to Habits
2. Click **"New Habit"**
3. Enter:
   - Title
   - Description
   - Frequency (Daily or Weekly)
4. Click **"Create Habit"**

**Tracking Habits:**
- Click on calendar days to mark habit as complete
- Current day is highlighted with a ring
- Green days = completed
- Gray days = not completed
- View Current Streak and Best Streak stats

**Understanding Streaks:**
- Streak counts consecutive days of completion
- Breaking a streak resets it to 0
- Longest streak is your personal best

### ⏱️ Time Tracking

**Starting a Timer:**
1. Go to Time Tracking
2. Click **"Start New Timer"**
3. Enter:
   - Category (e.g., Development, Meeting)
   - Description (optional)
4. Click **"Start Timer"**

**Using the Timer:**
- Large display shows elapsed time (HH:MM:SS)
- Click **"Stop Timer"** when done
- Timer automatically calculates duration
- View time by category in the summary

**Viewing Time Entries:**
- Recent entries show in chronological order
- See category, duration, and timestamps
- Delete entries you want to remove
- View daily/weekly summaries

### 📅 Timeline

The Timeline shows all your activities in chronological order:
- Tasks (with status and priority)
- Reminders (with completion status)
- Habits (with streak info)
- Time entries (with duration)

**Features:**
- Grouped by date (Today, Yesterday, specific dates)
- Color-coded by activity type
- Shows activity count per day
- Scrollable timeline view

### 📊 Analytics

View comprehensive insights:

**Task Analytics:**
- Task Status Distribution (pie chart)
- Tasks by Priority (bar chart)
- Completion rate percentage

**Goal Analytics:**
- Goal Progress (horizontal bar chart)
- Average progress across all goals

**Habit Analytics:**
- Habit Streaks (current vs. longest)
- Total streak count

**Time Analytics:**
- Time Spent by Category (bar chart)
- Total time tracked
- Session count

### ⚙️ Settings

**Profile Settings:**
- Update your name and email
- Change avatar (placeholder in demo)
- Save changes to update profile

**Appearance:**
- Choose theme: Light, Dark, or System
- Theme persists across sessions

**Notifications:**
- Toggle notifications on/off
- Enable/disable sound effects

**Data Management:**
- **Export Data**: Download all data as JSON
- **Clear Data**: Reset app to initial state (warning: irreversible)

## Tips & Best Practices

### Task Management
- Use **High priority** for urgent tasks
- Set realistic deadlines
- Break large tasks into smaller ones
- Review completed tasks weekly

### Goal Setting
- Make goals SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Break goals into 3-5 milestones
- Update progress regularly
- Celebrate milestone completions

### Habit Building
- Start with 1-3 habits
- Track daily for best results
- Don't break the chain!
- Review streaks weekly for motivation

### Time Tracking
- Start timer before beginning work
- Use consistent category names
- Review time analytics weekly
- Adjust work patterns based on insights

### Note Taking
- Use tags for organization
- Pin frequently referenced notes
- Use markdown for formatting
- Regular cleanup of old notes

## Keyboard Shortcuts (Future Enhancement)

Currently, the app is mouse/touch-driven. Keyboard shortcuts can be added in future versions.

## Data Persistence

- All data is stored in browser's localStorage
- Data persists across sessions
- Clearing browser data will reset the app
- Use **Export Data** regularly for backups

## Troubleshooting

**Data not saving:**
- Check browser localStorage is enabled
- Try clearing cache and reloading
- Export data before troubleshooting

**Theme not changing:**
- Refresh the page
- Check system theme settings if using "System" mode

**Charts not displaying:**
- Ensure you have data in the respective modules
- Try refreshing the page

## Mobile Usage

The app is fully responsive:
- Tap the menu icon (☰) to open sidebar
- Swipe to close sidebar
- All features work on mobile
- Touch-friendly interface

## Next Steps

1. **Customize**: Adjust theme and settings to your preference
2. **Import Data**: If you have existing data, you can manually import it
3. **Regular Use**: Make it part of your daily routine
4. **Review**: Check Analytics weekly to track progress
5. **Backup**: Export data monthly for safety

## Support

For issues or questions:
- Check this guide first
- Review the README.md
- Check browser console for errors
- Ensure you're using a modern browser (Chrome, Firefox, Safari, Edge)

---

**Happy Productivity! 🚀**
