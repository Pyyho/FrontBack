@echo off
echo Создание самоподписанного сертификата для localhost...
echo.

REM Проверяем наличие openssl
where openssl >nul 2>nul
if %errorlevel% neq 0 (
    echo [ОШИБКА] OpenSSL не найден!
    echo Установите OpenSSL: https://slproweb.com/products/Win32OpenSSL.html
    echo Или добавьте в PATH: C:\Program Files\OpenSSL-Win64\bin
    pause
    exit /b 1
)

REM Создаем сертификат
openssl req -x509 -newkey rsa:2048 -nodes ^
  -keyout localhost-key.pem ^
  -out localhost.pem ^
  -days 365 ^
  -subj "/CN=localhost" ^
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

if %errorlevel% equ 0 (
    echo.
    echo [УСПЕХ] Сертификаты созданы:
    echo   - localhost-key.pem
    echo   - localhost.pem
    echo.
    echo Теперь запустите: node server.js
) else (
    echo [ОШИБКА] Не удалось создать сертификаты
)

pause