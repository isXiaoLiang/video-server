<template>
  <div class="dashboard">
    <!-- 顶部导航栏 -->
    <el-header class="header">
      <div class="header-content">
        <h1>视频服务管理</h1>
        <div class="user-info">
          <span>{{ user.username }}</span>
          <el-button @click="handleLogout" type="danger" size="small">退出登录</el-button>
        </div>
      </div>
    </el-header>

    <!-- 主要内容区域 -->
    <el-main class="main">
      <!-- 统计信息卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-number">{{ stats.totalVideos }}</div>
            <div class="stat-label">视频总数</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-number">{{ formatSize(stats.totalSize) }}</div>
            <div class="stat-label">总存储大小</div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-number">{{ stats.totalViews }}</div>
            <div class="stat-label">总观看次数</div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 上传视频按钮 -->
      <div class="upload-section">
        <el-button type="primary" size="large" @click="showUploadDialog">
          <el-icon><Plus /></el-icon>
          上传新视频
        </el-button>
      </div>

      <!-- 视频列表 -->
      <div class="videos-section">
        <h3>我的视频</h3>
        <el-row :gutter="20">
          <el-col v-for="video in videos" :key="video.id" :span="8" :xs="24" :sm="12" :md="8">
            <VideoCard
              :video="video"
              @delete="handleDelete"
              @show-qrcode="showQrcodeDialog"
              @refresh="loadVideos"
            />
          </el-col>
        </el-row>
      </div>
    </el-main>

    <!-- 上传视频对话框 -->
    <VideoUpload
      v-model:visible="uploadDialogVisible"
      @success="handleUploadSuccess"
    />

    <!-- 二维码对话框 -->
    <QrcodeDialog
      v-model:visible="qrcodeDialogVisible"
      :video-id="selectedVideoId"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'
import VideoCard from '@/components/VideoCard.vue'
import VideoUpload from '@/components/VideoUpload.vue'
import QrcodeDialog from '@/components/QrcodeDialog.vue'

const router = useRouter()

const user = ref(JSON.parse(localStorage.getItem('user') || '{}'))
const videos = ref([])
const stats = ref({
  totalVideos: 0,
  totalSize: 0,
  totalViews: 0
})

const uploadDialogVisible = ref(false)
const qrcodeDialogVisible = ref(false)
const selectedVideoId = ref(null)

// 加载视频列表
const loadVideos = async () => {
  try {
    const response = await request.get('/videos')
    videos.value = response.videos
  } catch (error) {
    console.error('加载视频列表失败:', error)
  }
}

// 加载统计信息
const loadStats = async () => {
  try {
    const response = await request.get('/videos/stats/overview')
    stats.value = response.stats
  } catch (error) {
    console.error('加载统计信息失败:', error)
  }
}

// 格式化文件大小
const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

// 显示上传对话框
const showUploadDialog = () => {
  uploadDialogVisible.value = true
}

// 上传成功回调
const handleUploadSuccess = () => {
  uploadDialogVisible.value = false
  loadVideos()
  loadStats()
  ElMessage.success('上传成功')
}

// 显示二维码对话框
const showQrcodeDialog = (videoId) => {
  selectedVideoId.value = videoId
  qrcodeDialogVisible.value = true
}

// 删除视频
const handleDelete = async (videoId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个视频吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await request.delete(`/videos/${videoId}`)
    ElMessage.success('删除成功')
    loadVideos()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  router.push('/login')
}

// 页面加载时获取数据
onMounted(() => {
  loadVideos()
  loadStats()
})
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
}

.header {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 20px;
}

.header-content h1 {
  font-size: 20px;
  color: #333;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.main {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.stats-row {
  margin-bottom: 30px;
}

.stat-card {
  text-align: center;
  padding: 20px;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 10px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.upload-section {
  margin-bottom: 30px;
  text-align: center;
}

.videos-section h3 {
  margin-bottom: 20px;
  font-size: 18px;
  color: #333;
}
</style>