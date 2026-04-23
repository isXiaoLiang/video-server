const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 视频文件
app.use('/videos', express.static(path.join(__dirname, '../videos')));

// 静态文件服务 - HLS视频流文件
app.use('/hls', express.static(path.join(__dirname, '../videos/hls')));

// 静态文件服务 - 前端构建产物
const frontendPath = path.join(__dirname, process.env.FRONTEND_DIR || '../frontend/dist');
app.use(express.static(frontendPath));

// API路由
app.use('/api/auth', require('./routes/auth'));
app.use('/api/videos', require('./routes/videos'));

// 视频播放页面（用于微信扫码观看）
app.get('/watch/:id', async (req, res) => {
  const videoId = req.params.id;

  try {
    // 确保数据已加载
    await db.read();

    // 获取视频信息
    const video = db.data.videos.find(v => v.id === parseInt(videoId));

    if (!video) {
      return res.status(404).send('视频不存在');
    }

    // 更新观看次数
    video.view_count += 1;
    await db.write();

    // 判断是否使用HLS流播放
    const useHLS = video.optimized === true && video.hls_url;
    const isTranscoding = video.transcoding_status === 'processing' || video.transcoding_status === 'pending';

    // 获取视频播放地址
    let videoSrc = '';
    if (useHLS) {
      videoSrc = video.hls_url; // HLS流地址
    } else if (!isTranscoding) {
      videoSrc = `/videos/${video.filename}`; // 原始文件地址
    }

    // 返回HTML播放页面（支持HLS）
    res.send(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${video.title}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 12px rgba(0,0,0,0.1);
          }
          .video-info {
            padding: 20px;
          }
          .video-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
          .video-desc {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
          }
          .video-meta {
            font-size: 12px;
            color: #999;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
          }
          .hls-badge {
            background: #67C23A;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
          }
          video {
            width: 100%;
            display: block;
            background: #000;
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${isTranscoding ? `
            <div style="padding: 100px 20px; text-align: center;">
              <h3 style="color: #E6A23C; margin-bottom: 20px;">视频正在优化中...</h3>
              <p style="color: #999;">转码完成后即可播放，请稍后再试</p>
              <p style="color: #999; margin-top: 10px;">预计需要 1-3 分钟</p>
            </div>
          ` : `
            <video
              id="videoPlayer"
              controls
              autoplay
              playsinline
              webkit-playsinline
              x5-video-player-type="h5"
              x5-video-player-fullscreen="true"
            >
              ${!useHLS ? `<source src="${videoSrc}" type="${video.mimetype}">` : ''}
              您的浏览器不支持视频播放
            </video>
          `}
          <div class="video-info">
            <div class="video-title">${video.title}</div>
            ${video.description ? `<div class="video-desc">${video.description}</div>` : ''}
            <div class="video-meta">
              ${useHLS ? '<span class="hls-badge">优化版本</span>' : ''}
              ${isTranscoding ? '<span style="color: #E6A23C;">正在优化...</span>' : ''}
              <span>观看: ${video.view_count} 次</span>
              <span>上传时间: ${new Date(video.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        </div>

        ${useHLS ? `
        <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
        <script>
          var video = document.getElementById('videoPlayer');
          var videoSrc = '${videoSrc}';

          if (Hls.isSupported()) {
            var hls = new Hls({
              maxBufferLength: 30, // 最大缓冲长度30秒
              maxMaxBufferLength: 60, // 最大总缓冲60秒
            });
            hls.loadSource(videoSrc);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
              console.log('HLS视频流加载成功，开始播放');
              video.play();
            });
            hls.on(Hls.Events.ERROR, function(event, data) {
              console.error('HLS播放错误:', data);
              if (data.fatal) {
                switch(data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log('网络错误，尝试重新加载');
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log('媒体错误，尝试恢复');
                    hls.recoverMediaError();
                    break;
                  default:
                    console.log('无法恢复的错误');
                    hls.destroy();
                    break;
                }
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = videoSrc;
          }
        </script>
        ` : ''}
      </body>
      </html>
    `);
  } catch (error) {
    console.error('播放页面错误:', error);
    res.status(500).send('服务器错误');
  }
});

// SPA 路由回退 - 所有未匹配的GET请求返回前端 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器错误', error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`服务器监听所有网络接口，可通过IP访问`);
  console.log(`视频文件目录: ${path.join(__dirname, '../videos')}`);
});