@echo off
title AIOK Trading - Cloud Bot Only
echo ===================================================
echo    AIOK Trading - Cloud Mode (No MT5 needed)
echo    Telegram Bot + yfinance data
echo    For VPS / 24/7 operation
echo ===================================================
echo.

cd /d "%~dp0backend"

:loop
echo [%date% %time%] Starting cloud bot...
python -m telegram_bot.bot
echo.
echo [%date% %time%] Bot stopped! Restarting in 10 seconds...
timeout /t 10 /nobreak
goto loop
