# Timeline Views Documentation

TimeFlow now includes **two powerful timeline views** to visualize your work:

## 1. Activity Timeline (Default)
**Route:** `/timeline`

### Features:
- **Chronological feed** of all activities
- **Grouped by date** (Today, Yesterday, specific dates)
- **Activity types:**
  - Tasks (with status and priority)
  - Reminders (with completion status)
  - Habits (with streak information)
  - Time entries (with duration)
- **Color-coded** by activity type
- **Vertical timeline** with icons
- **Activity count** per day

### Best For:
- Daily activity review
- Quick overview of recent work
- Tracking completed items
- Reviewing habit consistency

---

## 2. Gantt Timeline View (Jira-style)
**Route:** `/timeline/gantt`

### Features:
- **Horizontal Gantt chart** layout
- **Visual timeline bars** showing task/goal duration
- **Multiple view modes:**
  - Day view (24-hour timeline)
  - Week view (7 days)
  - Month view (full month)
  - Quarter view (3 months)
- **Interactive elements:**
  - Click items to select
  - Hover for details
  - Color-coded by priority/type
- **Today indicator** (vertical line)
- **Progress visualization** for goals
- **Grid layout** with date headers

### Timeline Items:
1. **Tasks** (with deadlines)
   - Red: High priority
   - Orange: Medium priority
   - Blue: Low priority
   - Shows status badges

2. **Goals** (with target dates)
   - Green bars
   - Progress overlay (white fill)
   - Shows completion percentage

### Controls:
- **Navigation:** Previous/Next buttons (day/week/month/quarter increments)
- **Today button:** Jump to current date
- **View modes:** Day/Week/Month/Quarter tabs
- **Date range display:** Shows current period

### Day View Details:
- **24-hour timeline** (12 AM to 11 PM)
- **Hourly columns** for precise scheduling
- **Current hour indicator** (vertical line when viewing today)
- **Navigate day by day** using arrow buttons
- **Perfect for:** Daily planning, hour-by-hour scheduling, detailed time management

### Visual Elements:
- **Timeline bars:** Positioned based on start/end dates
- **Grid lines:** Vertical lines for each day
- **Today marker:** Highlighted column with primary color
- **Item info panel:** Left sidebar with icons and badges
- **Legend:** Color coding explanation

### Best For:
- Project planning
- Deadline visualization
- Long-term goal tracking
- Resource allocation
- Timeline conflicts identification
- Sprint planning

---

## Comparison

| Feature | Activity Timeline | Gantt Timeline |
|---------|------------------|----------------|
| Layout | Vertical feed | Horizontal bars |
| Time scope | All activities | Items with deadlines |
| Best for | Daily review | Planning & scheduling |
| Grouping | By date | By item |
| Detail level | High | Medium |
| Visual style | List view | Chart view |
| Interactivity | Read-only | Selectable items |

---

## Navigation

### From Activity Timeline to Gantt:
1. Go to **Timeline** from sidebar
2. Click **"Gantt View"** button (top right)

### From Gantt to Activity Timeline:
1. In Gantt view
2. Click **"Activity View"** button (top right)

---

## Usage Tips

### Activity Timeline:
- Review daily to track progress
- Check habit streaks
- Verify completed tasks
- Monitor time entries

### Gantt Timeline:
- Plan upcoming weeks/months
- Identify scheduling conflicts
- Track goal progress visually
- Adjust deadlines as needed
- Review project timelines

---

## Keyboard Shortcuts (Future)
- `←` / `→` : Navigate previous/next period
- `T` : Jump to today
- `W` / `M` / `Q` : Switch to Week/Month/Quarter view
- `Esc` : Deselect item

---

## Technical Details

### Gantt View Calculations:
- **Bar positioning:** Based on start date relative to view range
- **Bar width:** Proportional to duration
- **Progress overlay:** Percentage-based width for goals
- **Date range:** Dynamically calculated per view mode

### Responsive Design:
- Horizontal scroll on smaller screens
- Minimum width: 800px for Gantt chart
- Touch-friendly on mobile
- Optimized for desktop viewing

---

## Future Enhancements

### Planned Features:
- [ ] Drag-and-drop to reschedule
- [ ] Resize bars to adjust duration
- [ ] Dependencies between tasks
- [ ] Milestone markers
- [ ] Resource allocation view
- [ ] Export to image/PDF
- [ ] Zoom in/out controls
- [ ] Custom date ranges
- [ ] Filter by type/priority
- [ ] Multi-select items

---

**Both views are now available and fully functional!** 🎉

Choose the view that best fits your workflow:
- **Activity Timeline** for daily tracking
- **Gantt Timeline** for planning and visualization
