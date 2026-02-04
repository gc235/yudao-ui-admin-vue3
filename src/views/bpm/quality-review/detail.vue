<template>
  <ContentWrap>
    <el-descriptions :column="1" border>
      <el-descriptions-item label="任务ID">
        {{ detailData.taskId }}
      </el-descriptions-item>
      <el-descriptions-item label="发起人">
        {{ detailData.initiatorUsername }}
      </el-descriptions-item>
      <el-descriptions-item label="部门负责人">
        {{ detailData.initiatorDeptHeadUsernames?.join(', ') }}
      </el-descriptions-item>
    </el-descriptions>
  </ContentWrap>
</template>
<script lang="ts" setup>
import { propTypes } from '@/utils/propTypes'
import * as QualityReviewApi from '@/api/bpm/qualityReview'

defineOptions({ name: 'QualityReviewDetail' })

const { query } = useRoute() // 查询参数

const props = defineProps({
  id: propTypes.number.def(undefined)
})
const detailLoading = ref(false) // 表单的加载中
const detailData = ref<any>({}) // 详情数据
const queryId = query.id as unknown as number // 从 URL 传递过来的 id 编号

/** 获得数据 */
const getInfo = async () => {
  detailLoading.value = true
  try {
    detailData.value = await QualityReviewApi.getQualityReview(props.id || queryId)
  } finally {
    detailLoading.value = false
  }
}
defineExpose({ open: getInfo }) // 提供 open 方法，用于打开弹窗

/** 初始化 **/
onMounted(() => {
  getInfo()
})
</script>
