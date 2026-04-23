<template>
  <el-dialog
    v-model="dialogVisible"
    title="上传视频"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
      <el-form-item label="标题" prop="title">
        <el-input v-model="form.title" placeholder="请输入视频标题" />
      </el-form-item>

      <el-form-item label="描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入视频描述（可选）"
        />
      </el-form-item>

      <el-form-item label="视频文件" prop="video">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :limit="1"
          :on-change="handleFileChange"
          :on-exceed="handleExceed"
          accept="video/mp4,video/webm,video/ogg,video/mov,video/avi,.mp4,.webm,.ogg,.mov,.avi"
          drag
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            将视频文件拖到此处，或<em>点击上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持mp4、webm、ogg、mov、avi格式，最大500MB
            </div>
          </template>
        </el-upload>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleUpload" :loading="uploading">
          上传
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import request from '@/utils/request'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'success'])

const dialogVisible = ref(props.visible)
const formRef = ref()
const uploadRef = ref()
const uploading = ref(false)
const videoFile = ref(null)

const form = ref({
  title: '',
  description: '',
  video: null
})

const rules = {
  title: [{ required: true, message: '请输入视频标题', trigger: 'blur' }],
  video: [{ required: true, message: '请选择视频文件', trigger: 'change' }]
}

// 监听visible属性变化
watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val) {
    // 重置表单
    form.value = { title: '', description: '', video: null }
    videoFile.value = null
  }
})

// 监听dialogVisible变化
watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

// 文件选择
const handleFileChange = (file) => {
  // 检查文件大小
  if (file.size > 500 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过500MB')
    uploadRef.value.clearFiles()
    return
  }

  videoFile.value = file.raw
  form.value.video = file.raw

  // 自动填充标题
  if (!form.value.title) {
    const fileName = file.name.substring(0, file.name.lastIndexOf('.'))
    form.value.title = fileName
  }
}

// 超出文件数量限制
const handleExceed = () => {
  ElMessage.warning('只能上传一个视频文件')
}

// 取消上传
const handleCancel = () => {
  dialogVisible.value = false
}

// 上传视频
const handleUpload = async () => {
  try {
    await formRef.value.validate()

    if (!videoFile.value) {
      ElMessage.error('请选择视频文件')
      return
    }

    uploading.value = true

    // 创建FormData
    const formData = new FormData()
    formData.append('title', form.value.title)
    formData.append('description', form.value.description || '')
    formData.append('video', videoFile.value)

    // 发送上传请求
    await request.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    emit('success')
    dialogVisible.value = false
  } catch (error) {
    console.error('上传失败:', error)
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.el-upload {
  width: 100%;
}

.el-upload-dragger {
  width: 100%;
}
</style>