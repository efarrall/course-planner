# Course Planner

Desktop application for planning courses across semesters. Validates prerequisites, tracks credits, and manages course scheduling through a drag-and-drop interface.

## Features

- Drag and drop courses between semesters
- Automatic prerequisite validation
- Credit tracking per semester and total
- Auto-saves to file system every 2 seconds after changes
- Export data to dedicated exports folder
- Import data with file picker
- Manages multiple degree programs

## Setup

Install dependencies:
```bash
npm install
```

Run the application:
```bash
npm run electron:dev
```

### Desktop Shortcut (Windows)

Create a desktop shortcut for easier access:
```bash
powershell -ExecutionPolicy Bypass -File create-shortcut.ps1
```

This creates a "Course Planner" shortcut on your desktop that launches the app.

## Usage

### Adding Courses
Click "Add Course" to create a new course. Fill in:
- Course code
- Title
- Credits
- Level (Undergraduate/Graduate)
- Prerequisites
- Delivery mode
- Semester restrictions

### Managing Courses
- Drag courses between semesters to reschedule
- Courses start in the "Course Pool" and can be dragged to any semester
- Prerequisites are validated in real-time
- Violations appear at the top of the window

### Auto-Save
The application automatically saves to the file system 2 seconds after any change. No manual save required.

### Export and Import
- **Export**: Saves current data to the exports folder with timestamp
- **Import**: Opens file picker starting in saves folder to load previous data

## File Locations

**Auto-saves:** `C:\Users\YourName\AppData\Roaming\course-planner\saves\`

**Manual exports:** `C:\Users\YourName\AppData\Roaming\course-planner\exports\`

Files are timestamped and stored as JSON.

## Building

Create a distributable installer:
```bash
npm run electron:build
```

Output will be in the `dist/` folder.

## Technology

Built with React and Electron. Uses Node.js file system API for data persistence.
