const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

/**
 * 视频转码和HLS切片处理模块
 *
 * 功能：
 * 1. 将原始视频转码压缩（720p, 2Mbps码率）
 * 2. 生成HLS视频流文件（.m3u8 + .ts片段）
 *
 * 优势：
 * - 文件大小减少约70%
 * - 支持边下载边播放（不需要下载完整文件）
 * - 多人观看时带宽占用大幅降低
 */

/**
 * 转码视频为HLS格式
 * @param {string} inputPath - 输入视频文件路径
 * @param {string} outputDir - HLS输出目录
 * @param {number} videoId - 视频ID
 * @returns {Promise} 返回HLS文件路径信息
 */
const transcodeToHLS = async (inputPath, outputDir, videoId) => {
  return new Promise((resolve, reject) => {
    // 确保输出目录存在
    const hlsDir = path.join(outputDir, String(videoId));
    if (!fs.existsSync(hlsDir)) {
      fs.mkdirSync(hlsDir, { recursive: true });
    }

    // HLS输出文件路径
    const hlsPlaylist = path.join(hlsDir, 'index.m3u8');
    const hlsSegmentPrefix = path.join(hlsDir, 'segment');

    console.log(`开始转码视频: ${inputPath}`);
    console.log(`HLS输出目录: ${hlsDir}`);

    ffmpeg(inputPath)
      // 视频压缩参数：720p分辨率，2Mbps码率
      .videoCodec('libx264')
      .size('1280x720') // 720p分辨率
      .videoBitrate('2000k') // 2Mbps码率
      .outputOptions([
        '-preset fast', // 快速编码，适合实时处理
        '-crf 23', // 恒定质量因子（18-28之间，23是平衡质量和文件大小）
        '-movflags +faststart', // 允许边下载边播放
      ])
      // 音频压缩参数：AAC编码，128kbps码率
      .audioCodec('aac')
      .audioBitrate('128k')
      // HLS切片配置
      .outputOptions([
        '-hls_time 10', // 每个片段10秒
        '-hls_list_size 0', // 列表包含所有片段
        '-hls_segment_filename ' + hlsSegmentPrefix + '%d.ts', // 片段文件名格式
        '-f hls', // 输出格式为HLS
      ])
      .output(hlsPlaylist)
      // 进度监控
      .on('progress', (progress) => {
        console.log(`转码进度: ${Math.round(progress.percent || 0)}%`);
      })
      // 完成回调
      .on('end', () => {
        console.log(`HLS转码完成: ${hlsPlaylist}`);

        // 获取生成的文件列表
        const files = fs.readdirSync(hlsDir);
        const tsFiles = files.filter(f => f.endsWith('.ts'));

        resolve({
          hlsPath: hlsDir,
          playlist: 'index.m3u8',
          playlistFullPath: hlsPlaylist,
          segments: tsFiles,
          segmentCount: tsFiles.length,
          hlsUrl: `/hls/${videoId}/index.m3u8`
        });
      })
      // 错误处理
      .on('error', (err) => {
        console.error('视频转码失败:', err.message);
        reject(err);
      })
      .run();
  });
};

/**
 * 获取视频文件信息
 * @param {string} filePath - 视频文件路径
 * @returns {Promise} 返回视频元数据
 */
const getVideoMetadata = async (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name,
          videoStreams: metadata.streams.filter(s => s.codec_type === 'video'),
          audioStreams: metadata.streams.filter(s => s.codec_type === 'audio'),
        });
      }
    });
  });
};

/**
 * 清理HLS文件（删除视频时使用）
 * @param {string} hlsDir - HLS目录路径
 */
const cleanupHLSFiles = (hlsDir) => {
  try {
    if (fs.existsSync(hlsDir)) {
      const files = fs.readdirSync(hlsDir);
      files.forEach(file => {
        fs.unlinkSync(path.join(hlsDir, file));
      });
      fs.rmdirSync(hlsDir);
      console.log(`HLS文件已清理: ${hlsDir}`);
    }
  } catch (err) {
    console.error('清理HLS文件失败:', err.message);
  }
};

module.exports = {
  transcodeToHLS,
  getVideoMetadata,
  cleanupHLSFiles,
};