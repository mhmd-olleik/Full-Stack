Set WScriptShell = CreateObject("WScript.Shell")
StartupFolder = WScriptShell.SpecialFolders("Startup")
Set Shortcut = WScriptShell.CreateShortcut(StartupFolder & "\NexusAI.lnk")
Shortcut.TargetPath = "C:\Users\dell\Desktop\ai trading\start_nexus.bat"
Shortcut.WorkingDirectory = "C:\Users\dell\Desktop\ai trading"
Shortcut.Description = "NEXUS AI Trading Bot - Auto Start"
Shortcut.WindowStyle = 7
Shortcut.Save
WScript.Echo "Done! NEXUS AI will auto-start when you log in."
