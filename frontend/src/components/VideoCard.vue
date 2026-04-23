<template>
  <el-card class="video-card" :body-style="{ padding: '0px' }">
    <!-- 视频预览 -->
    <div class="video-preview">
      <video
        ref="videoPlayer"
        controls
        preload="metadata"
      ></video>
      <div v-if="video.transcoding_status === 'processing'" class="transcoding-overlay">
        <span>正在转码中...</span>
      </div>
    </div>

    <!-- 视频信息 -->
    <div class="video-info">
      <h4>{{ video.title }}</h4>
      <p class="description">{{ video.description || '暂无描述' }}</p>
      <div class="meta">
        <span>观看: {{ video.view_count }} 次</span>
        <span>{{ formatDate(video.created_at) }}</span>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="video-actions">
      <el-button type="primary" size="small" @click="handleShowQrcode">
        <el-icon><Qrcode /></el-icon>
        二维码
      </el-button>
      <el-button type="danger" size="small" @click="handleDelete">
        <el-icon><Delete /></el-icon>
        删除
      </el-button>
    </div>
  </el-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Delete, Qrcode } from '@element-plus/icons-vue'
import Hls from 'hls.js'

const props = defineProps({
  video: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['delete', 'show-qrcode', 'refresh'])

const videoPlayer = ref(null)
let hlsInstance = null

// 初始化视频播放器
const initVideoPlayer = () => {
  const video = videoPlayer.value
  if (!video) return

  // 检查视频是否已优化为HLS格式
  if (props.video.optimized && props.video.hls_url) {
    // 使用HLS.js播放
    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      })
      hlsInstance.loadSource(props.video.hls_url)
      hlsInstance.attachMedia(video)
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS视频流加载成功')
      })
      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS播放错误:', data)
        if (data.fatal) {
          switch(data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hlsInstance.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsInstance.recoverMediaError()
              break
            default:
              hlsInstance.destroy()
              break
          }
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari原生支持HLS
      video.src = props.video.hls_url
    }
  } else if (props.video.filename && !props.video.optimized) {
    // 未优化的视频，使用原始文件
    video.src = `/videos/${props.video.filename}`
  }
}

// 监听video变化，重新初始化
watch(() => props.video, () => {
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }
  initVideoPlayer()
}, { deep: true })

// 组件挂载时初始化
onMounted(() => {
  initVideoPlayer()
})

// 组件卸载时清理HLS实例
onUnmounted(() => {
  if (hlsInstance) {
    hlsInstance.destroy()
    hlsInstance = null
  }
})

// 显示二维码
const handleShowQrcode = () => {
  emit('show-qrcode', props.video.id)
}

// 删除视频
const handleDelete = () => {
  emit('delete', props.video.id)
}

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.video-card {
  margin-bottom: 20px;
  overflow: hidden;
}

.video-preview {
  width: 100%;
  height: 200px;
  background: #000;
}

.video-preview video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-info {
  padding: 15px;
}

.video-info h4 {
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.description {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.video-actions {
  padding: 10px 15px;
  display: flex;
  gap: 10px;
  justify-content: space-between;
}

.transcoding-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.video-preview {
  position: relative;
  width: 100%;
  height: 200px;
  background: #000;
}
</style>