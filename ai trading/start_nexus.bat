@echo off
title AIOK Trading - Trading Engine
color 0A

echo.
echo  ===================================================
echo  ^|       AIOK Trading - TRADING ENGINE LAUNCHER         ^|
echo  ^|         XAUUSD Intelligence System               ^|
echo  ===================================================
echo.
echo  [1] Starting MetaTrader 5 check...
echo  [2] Starting Backend Server...
echo.

cd /d "%~dp0backend"
python server.py

pause
