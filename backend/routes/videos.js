const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const db = require('../config/database');
const auth = require('../middleware/auth');
const { transcodeToHLS, cleanupHLSFiles } = require('../utils/videoProcessor');

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'video-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 限制500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|webm|ogg|mov|avi/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('不支持的视频格式'));
    }
  }
});

// 上传视频
router.post('/upload', auth, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择视频文件' });
    }

    const { title, description } = req.body;
    const { filename, path: filepath, size, mimetype } = req.file;

    // 确保数据已加载
    await db.read();

    // 创建视频记录（包含HLS转码状态）
    const newVideo = {
      id: db.data.videos.length > 0 ? Math.max(...db.data.videos.map(v => v.id)) + 1 : 1,
      title: title || filename,
      description: description || '',
      filename,
      filepath,
      size,
      mimetype,
      user_id: req.userId,
      view_count: 0,
      created_at: new Date().toISOString(),
      // HLS相关字段
      hls_path: null,
      hls_url: null,
      transcoding_status: 'pending', // pending, processing, completed, failed
      transcoding_error: null
    };

    db.data.videos.push(newVideo);
    await db.write();

    // 立即返回响应（异步转码）
    res.status(201).json({
      message: '上传成功，正在后台转码优化',
      video: {
        id: newVideo.id,
        title: newVideo.title,
        description: newVideo.description,
        filename,
        size,
        url: `/videos/${filename}`,
        transcoding_status: 'pending'
      }
    });

    // 异步启动转码任务（不阻塞响应）
    startTranscodingTask(newVideo.id, filepath);

  } catch (error) {
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 异步转码任务
async function startTranscodingTask(videoId, inputPath) {
  try {
    console.log(`开始异步转码任务，视频ID: ${videoId}`);

    // 更新状态为processing
    await db.read();
    const video = db.data.videos.find(v => v.id === videoId);
    if (video) {
      video.transcoding_status = 'processing';
      await db.write();
    }

    // HLS输出目录
    const hlsOutputDir = path.join(__dirname, '../../videos/hls');

    // 执行转码
    const hlsResult = await transcodeToHLS(inputPath, hlsOutputDir, videoId);

    // 计算HLS文件总大小
    const hlsFiles = fs.readdirSync(hlsResult.hlsPath);
    let hlsTotalSize = 0;
    hlsFiles.forEach(file => {
      const filePath = path.join(hlsResult.hlsPath, file);
      hlsTotalSize += fs.statSync(filePath).size;
    });

    console.log(`HLS文件总大小: ${hlsTotalSize} bytes (${Math.round(hlsTotalSize / 1024 / 1024)} MB)`);
    console.log(`原始文件大小: ${video.size} bytes (${Math.round(video.size / 1024 / 1024)} MB)`);
    console.log(`节省空间: ${Math.round((video.size - hlsTotalSize) / 1024 / 1024)} MB`);

    // 删除原始视频文件（节省存储空间）
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
      console.log(`原始文件已删除: ${inputPath}`);
    }

    // 更新数据库记录（转码完成）
    await db.read();
    const updatedVideo = db.data.videos.find(v => v.id === videoId);
    if (updatedVideo) {
      updatedVideo.hls_path = hlsResult.hlsPath;
      updatedVideo.hls_url = hlsResult.hlsUrl;
      updatedVideo.transcoding_status = 'completed';
      updatedVideo.hls_segment_count = hlsResult.segmentCount;
      updatedVideo.size = hlsTotalSize; // 更新为优化后的文件大小
      updatedVideo.original_size = video.size; // 保留原始大小记录
      updatedVideo.optimized = true; // 标记为已优化
      updatedVideo.filepath = null; // 原始文件已删除
      await db.write();
    }

    console.log(`转码完成，视频ID: ${videoId}, HLS路径: ${hlsResult.hlsUrl}`);
  } catch (error) {
    console.error(`转码失败，视频ID: ${videoId}`, error.message);

    // 更新状态为failed
    await db.read();
    const video = db.data.videos.find(v => v.id === videoId);
    if (video) {
      video.transcoding_status = 'failed';
      video.transcoding_error = error.message;
      await db.write();
    }
  }
}

// 获取视频列表
router.get('/', auth, async (req, res) => {
  try {
    await db.read();

    // 获取视频并关联用户名
    const videos = db.data.videos.map(v => {
      const user = db.data.users.find(u => u.id === v.user_id);
      return {
        ...v,
        username: user ? user.username : '未知用户'
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ videos });
  } catch (error) {
    res.status(500).json({ message: '获取视频列表失败', error: error.message });
  }
});

// 获取单个视频信息
router.get('/:id', async (req, res) => {
  try {
    await db.read();

    const video = db.data.videos.find(v => v.id === parseInt(req.params.id));

    if (!video) {
      return res.status(404).json({ message: '视频不存在' });
    }

    // 获取用户名
    const user = db.data.users.find(u => u.id === video.user_id);

    // 更新观看次数
    video.view_count += 1;
    await db.write();

    res.json({
      video: {
        ...video,
        username: user ? user.username : '未知用户'
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取视频信息失败', error: error.message });
  }
});

// 删除视频
router.delete('/:id', auth, async (req, res) => {
  try {
    await db.read();

    const videoIndex = db.data.videos.findIndex(v => v.id === parseInt(req.params.id));

    if (videoIndex === -1) {
      return res.status(404).json({ message: '视频不存在' });
    }

    const video = db.data.videos[videoIndex];

    // 删除原始文件（如果存在）
    if (video.filepath && fs.existsSync(video.filepath)) {
      fs.unlinkSync(video.filepath);
      console.log(`原始文件已删除: ${video.filepath}`);
    }

    // 删除HLS文件（如果存在）
    if (video.hls_path && fs.existsSync(video.hls_path)) {
      cleanupHLSFiles(video.hls_path);
      console.log(`HLS文件已删除: ${video.hls_path}`);
    }

    // 删除数据库记录
    db.data.videos.splice(videoIndex, 1);
    await db.write();

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除视频失败:', error);
    res.status(500).json({ message: '删除失败', error: error.message });
  }
});

// 生成二维码
router.get('/:id/qrcode', async (req, res) => {
  try {
    // 获取真实的访问地址
    const forwardedHost = req.get('X-Forwarded-Host') || req.get('X-Real-Host');
    const protocol = req.protocol;

    let host;
    if (forwardedHost) {
      // 如果有转发地址，替换端口为后端端口
      // forwardedHost可能是 192.168.1.5:5173，需要改为 192.168.1.5:3000
      const hostWithoutPort = forwardedHost.split(':')[0];
      host = `${hostWithoutPort}:${process.env.PORT || 3000}`;
    } else {
      // 否则使用直接访问的地址
      host = req.get('host');
    }

    const videoUrl = `${protocol}://${host}/watch/${req.params.id}`;

    console.log('生成二维码URL:', videoUrl);

    const qrCodeDataUrl = await QRCode.toDataURL(videoUrl, {
      width: 300,
      margin: 2
    });

    res.json({
      qrCode: qrCodeDataUrl,
      url: videoUrl
    });
  } catch (error) {
    res.status(500).json({ message: '生成二维码失败', error: error.message });
  }
});

// 获取统计信息
router.get('/stats/overview', auth, async (req, res) => {
  try {
    await db.read();

    const userVideos = db.data.videos.filter(v => v.user_id === req.userId);

    const totalVideos = userVideos.length;
    const totalSize = userVideos.reduce((sum, v) => sum + (v.size || 0), 0);
    const totalViews = userVideos.reduce((sum, v) => sum + (v.view_count || 0), 0);

    res.json({
      stats: {
        totalVideos,
        totalSize,
        totalViews
      }
    });
  } catch (error) {
    res.status(500).json({ message: '获取统计信息失败', error: error.message });
  }
});

module.exports = router;