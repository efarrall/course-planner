# Course Planner

desktop app for planning courses and semesters. drag and drop courses between semesters, checks prerequisites, tracks credits.

## what it does

- drag courses between semesters
- validates prerequisites automatically
- tracks credits per semester and total
- auto-saves every 2 seconds to files
- import/export course data

## setup

### install

```bash
npm install
```

### run

```bash
npm run electron:dev
```

### create desktop shortcut (windows)

```bash
powershell -ExecutionPolicy Bypass -File create-shortcut.ps1
```

this creates a "Course Planner" shortcut on your desktop. double click it to launch.

## file locations

saves are stored in:
```
C:\Users\YourName\AppData\Roaming\course-planner\saves\
```

exports go to:
```
C:\Users\YourName\AppData\Roaming\course-planner\exports\
```

## build installer

```bash
npm run electron:build
```

creates installer in `dist/` folder

## how to use

1. click "Add Course" to create courses
2. drag courses between semesters
3. violations show up at the top if prerequisites aren't met
4. auto-saves as you work
5. export button saves to exports folder
6. import button opens file picker in saves folder

## tech stack

- react
- electron
- tailwindcss

works on my machine
