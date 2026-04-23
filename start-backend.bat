@echo off
chcp 65001 >nul
echo ========================================
echo   视频服务启动脚本 v1.0.0
echo ========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

:: 检查后端依赖
if not exist "backend\node_modules" (
    echo [安装] 正在安装后端依赖...
    cd backend && npm install && cd ..
)

:: 检查前端构建产物，不存在则构建
if not exist "frontend\dist\index.html" (
    echo [构建] 前端构建产物不存在，正在构建前端...
    if not exist "frontend\node_modules" (
        echo [安装] 正在安装前端依赖...
        cd frontend && npm install && cd ..
    )
    cd frontend && npm run build && cd ..
    echo [完成] 前端构建完成
    echo.
)

:: 创建必要目录
if not exist "videos" mkdir videos
if not exist "videos\hls" mkdir videos\hls
if not exist "database" mkdir database

:: 启动后端服务
echo [启动] 正在启动服务...
echo ========================================
echo   访问地址: http://localhost:3000
echo   按 Ctrl+C 停止服务
echo ========================================
echo.
cd backend
node server.js
