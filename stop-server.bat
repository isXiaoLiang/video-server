@echo off
chcp 65001 >nul
echo ========================================
echo   停止视频服务
echo ========================================
echo.

:: 查找并终止占用 3000 端口的进程
echo [查找] 正在查找占用 3000 端口的进程...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo [终止] 发现进程 PID: %%a
    taskkill /PID %%a /F >nul 2>&1
    if %errorlevel% equ 0 (
        echo [成功] 进程 %%a 已终止
    ) else (
        echo [失败] 无法终止进程 %%a，可能需要管理员权限
    )
)

:: 同时检查 5173 端口（前端开发服务器）
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do (
    echo [终止] 发现前端开发进程 PID: %%a
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo [完成] 服务已停止
timeout /t 3 >nul
