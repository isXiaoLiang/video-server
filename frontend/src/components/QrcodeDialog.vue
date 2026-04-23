<template>
  <el-dialog
    v-model="dialogVisible"
    title="视频二维码"
    width="400px"
    center
  >
    <div class="qrcode-content">
      <div v-if="loading" class="loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        <p>生成二维码中...</p>
      </div>

      <div v-else-if="qrcodeData" class="qrcode-show">
        <img :src="qrcodeData.qrCode" alt="二维码" class="qrcode-image" />
        <p class="url-text">{{ qrcodeData.url }}</p>
        <el-button type="primary" @click="copyUrl">复制链接</el-button>
      </div>

      <div v-else class="error">
        <p>生成二维码失败</p>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import request from '@/utils/request'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  videoId: {
    type: Number,
    default: null
  }
})

const emit = defineEmits(['update:visible'])

const dialogVisible = ref(props.visible)
const loading = ref(false)
const qrcodeData = ref(null)

// 监听visible属性变化
watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val && props.videoId) {
    generateQrcode()
  }
})

// 监听dialogVisible变化
watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

// 生成二维码
const generateQrcode = async () => {
  try {
    loading.value = true
    qrcodeData.value = null

    const response = await request.get(`/videos/${props.videoId}/qrcode`)
    qrcodeData.value = response
  } catch (error) {
    console.error('生成二维码失败:', error)
    ElMessage.error('生成二维码失败')
  } finally {
    loading.value = false
  }
}

// 复制链接
const copyUrl = async () => {
  const url = qrcodeData.value.url

  try {
    // 尝试使用现代clipboard API（需要HTTPS或localhost）
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url)
      ElMessage.success('链接已复制到剪贴板')
      return
    }

    // Fallback方案：使用document.execCommand（兼容HTTP环境）
    const textarea = document.createElement('textarea')
    textarea.value = url
    textarea.style.position = 'fixed'
    textarea.style.left = '-999999px'
    textarea.style.top = '-999999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textarea)

    if (successful) {
      ElMessage.success('链接已复制到剪贴板')
    } else {
      ElMessage.error('复制失败，请手动复制')
    }
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}
</script>

<style scoped>
.qrcode-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.loading {
  text-align: center;
}

.loading .el-icon {
  font-size: 40px;
  color: #409EFF;
  margin-bottom: 10px;
}

.qrcode-show {
  text-align: center;
}

.qrcode-image {
  width: 300px;
  height: 300px;
  margin-bottom: 20px;
}

.url-text {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
  word-break: break-all;
}

.error {
  text-align: center;
  color: #999;
}
</style>