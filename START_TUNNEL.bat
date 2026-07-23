@echo off
title AU Core Tunnel - NE ZATVARAJ
color 0A
echo ============================================
echo  AU CORE TUNNEL - drzi prozor otvoren
echo  Za kopiranje: desni klik, Select All, Enter
echo ============================================
echo.
:loop
npx cloudflared tunnel --url http://localhost:3000 2^>^&1 ^| powershell -NoProfile -Command "$input | ForEach-Object { Write-Host $_; if ($_ -match 'https://([a-z0-9-]+\.trycloudflare\.com)') { $url = 'https://' + $matches[1]; Set-Content -Path 'D:\BELORA\autouniverse\tunnel_active.txt' -Value $url -NoNewline; Write-Host ('>>> ZAPISAN URL: ' + $url) -ForegroundColor Yellow } }"
echo.
echo [!] Tunnel je pao - restartujem za 3s...
timeout /t 3 /nobreak
goto loop
