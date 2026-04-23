# 视频服务应用

一个简单的视频分享应用，支持上传视频、生成二维码，微信扫码即可观看。

## 功能特性

- ✅ 用户登录注册
- ✅ 视频上传（支持mp4、webm等格式）
- ✅ 视频列表管理
- ✅ 二维码生成
- ✅ 微信扫码观看
- ✅ 实时统计视频数量和观看次数
- ✅ 干净简洁的管理界面

## 技术栈

### 后端
- Node.js + Express
- LowDB（JSON文件数据库）
- JWT认证
- Multer（文件上传）
- QRCode（二维码生成）

### 前端
- Vue 3 + Vite
- Element Plus（UI组件库）
- Axios（HTTP请求）

## 项目结构

```
video-service/
├── backend/          # 后端服务
│   ├── config/       # 配置文件
│   ├── middleware/   # 中间件
│   ├── routes/       # 路由
│   └── server.js     # 服务器入口
├── frontend/         # 前端应用
├── videos/           # 视频存储目录
└── database/         # 数据库文件
```

## 快速开始

### 0. 确认依赖已安装

后端和前端依赖已经安装完成，您可以直接启动服务。

如果需要重新安装依赖：

```bash
# 后端依赖
cd backend
npm install

# 前端依赖
cd frontend
npm install
```

### 1. 启动后端服务

```bash
cd backend
npm run dev        # 启动开发服务器（使用nodemon，支持热重启）
# 或
npm start          # 启动生产服务器
```

后端服务将运行在 `http://localhost:3000`

首次启动时会看到：
- "成功连接到LowDB数据库"
- "数据库表初始化完成"
- "服务器运行在 http://localhost:3000"

### 2. 启动前端应用

**注意：需要新开一个终端窗口**

```bash
cd frontend
npm run dev
```

前端应用将运行在 `http://localhost:5173`

在浏览器中打开 `http://localhost:5173` 即可访问应用。

### 3. 使用应用

#### 步骤1：注册账号
1. 打开 `http://localhost:5173`
2. 点击"还没有账号？去注册"
3. 输入用户名和密码（密码至少6个字符）
4. 点击"注册"按钮
5. 注册成功后会自动跳转到主页面

#### 步骤2：上传视频
1. 在主页面点击"上传新视频"按钮
2. 输入视频标题（必填）
3. 输入视频描述（可选）
4. 选择或拖拽视频文件（支持mp4、webm等格式，最大500MB）
5. 点击"上传"按钮
6. 上传成功后，视频会出现在视频列表中

#### 步骤3：生成二维码
1. 在视频卡片中点击"二维码"按钮
2. 系统会生成一个二维码图片
3. 点击"复制链接"可以复制视频链接

#### 步骤4：微信扫码观看（需要内网穿透）
参见下方的"使用内网穿透"部分。

### 4. 使用内网穿透（微信扫码）

为了让微信能够扫码访问，需要使用内网穿透工具将本地服务暴露到公网。

#### 方案一：使用 ngrok（推荐）

**步骤1：安装ngrok**
1. 访问 https://ngrok.com
2. 注册账号（免费）
3. 下载并安装ngrok

**步骤2：启动ngrok**

在**第三个终端窗口**中运行：

```bash
ngrok http 3000
```

ngrok会显示类似这样的信息：
```
Session Status                online
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

**步骤3：更新二维码URL**

重要：由于ngrok提供的URL是动态的，每次重启ngrok都会变化，所以：

1. 复制ngrok提供的URL（如 `https://abc123.ngrok.io`）
2. 确保后端服务器在ngrok启动后重新启动（或使用nodemon自动重启）
3. 在前端生成二维码时，二维码中的URL会自动包含ngrok的域名

**步骤4：微信扫码观看**
1. 用手机微信扫描二维码
2. 微信会打开视频播放页面
3. 视频会自动播放（需要点击播放按钮）

#### 方案二：使用其他内网穿透工具

您也可以使用其他内网穿透工具：
- **cpolar**：国内服务，速度较快
- **localtunnel**：免费，无需注册
- **serveo**：免费，无需安装

使用方法类似，都是将本地3000端口暴露到公网。

## API文档

### 认证接口

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 视频接口

- `POST /api/videos/upload` - 上传视频（需要认证）
- `GET /api/videos` - 获取视频列表（需要认证）
- `GET /api/videos/:id` - 获取单个视频信息
- `DELETE /api/videos/:id` - 删除视频（需要认证）
- `GET /api/videos/:id/qrcode` - 生成视频二维码
- `GET /api/videos/stats/overview` - 获取统计信息（需要认证）

### 播放页面

- `GET /watch/:id` - 视频播放页面（微信扫码访问）

## 微信兼容性

视频播放页面专门针对微信内置浏览器进行了优化：

- 使用标准HTML5 video标签
- 支持 `playsinline` 属性，避免全屏播放
- 支持腾讯X5内核的特殊属性
- 移动端友好的响应式设计
- 自动播放功能

## 注意事项

1. 视频文件大小限制为500MB
2. 支持的视频格式：mp4, webm, ogg, mov, avi
3. 数据存储在JSON文件中，适合小型应用
4. 建议使用MP4/H.264格式以确保微信兼容性