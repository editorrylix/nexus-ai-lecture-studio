Set WshShell = CreateObject("WScript.Shell")
WshShell.Run Chr(34) & "local-transcriber-ai\venv\Scripts\pythonw.exe" & Chr(34) & " " & Chr(34) & "local-transcriber-ai\tray_app.py" & Chr(34), 0, False
Set WshShell = Nothing
