@echo off
setlocal
set ROOT=%~dp0
powershell -ExecutionPolicy Bypass -File "%ROOT%scripts\setup-new-machine.ps1" %*
pause
