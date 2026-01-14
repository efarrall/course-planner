$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\Course Planner.lnk")
$Shortcut.TargetPath = "C:\Users\farra\course-planner\start-course-planner.bat"
$Shortcut.WorkingDirectory = "C:\Users\farra\course-planner"
$Shortcut.IconLocation = "C:\Users\farra\course-planner\public\favicon.ico"
$Shortcut.Save()
Write-Host "Desktop shortcut created successfully!"
