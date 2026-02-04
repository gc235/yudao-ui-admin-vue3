<template>
  <doc-alert title="审批接入（业务表单）" url="https://doc.iocoder.cn/bpm/use-business-form/" />

  <ContentWrap>
    <!-- 搜索工作栏 -->
    <el-form
      ref="queryFormRef"
      :inline="true"
      :model="queryParams"
      class="-mb-15px"
      label-width="68px"
    >
      <el-form-item label="任务ID" prop="taskId">
        <el-input
          v-model="queryParams.taskId"
          class="!w-240px"
          clearable
          placeholder="请输入任务ID"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="发起人" prop="initiatorUsername">
        <el-input
          v-model="queryParams.initiatorUsername"
          class="!w-240px"
          clearable
          placeholder="请输入发起人"
          @keyup.enter="handleQuery"
        />
      </el-form-item>
      <el-form-item label="审批结果" prop="status">
        <el-select
          v-model="queryParams.status"
          class="!w-240px"
          clearable
          placeholder="请选择审批结果"
        >
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="申请时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-240px"
          end-placeholder="结束日期"
          start-placeholder="开始日期"
          type="daterange"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery">
          <Icon class="mr-5px" icon="ep:search" />
          搜索
        </el-button>
        <el-button @click="resetQuery">
          <Icon class="mr-5px" icon="ep:refresh" />
          重置
        </el-button>
        <el-button plain type="primary" @click="handleCreate()">
          <Icon class="mr-5px" icon="ep:plus" />
          发起质检
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column align="center" label="申请编号" prop="id" />
      <el-table-column align="center" label="任务ID" prop="taskId" />
      <el-table-column align="center" label="发起人" prop="initiatorUsername" />
      <el-table-column align="center" label="部门负责人" prop="initiatorDeptHeadUsernames">
        <template #default="scope">
          {{ scope.row.initiatorDeptHeadUsernames?.join(', ') }}
        </template>
      </el-table-column>
      <el-table-column align="center" label="状态" prop="status">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.BPM_PROCESS_INSTANCE_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column
        :formatter="dateFormatter"
        align="center"
        label="申请时间"
        prop="createTime"
        width="180"
      />
      <el-table-column align="center" label="操作" width="200">
        <template #default="scope">
          <el-button
            v-hasPermi="['bpm:quality-review:query']"
            link
            type="primary"
            @click="handleDetail(scope.row)"
          >
            详情
          </el-button>
          <el-button
            v-hasPermi="['bpm:quality-review:query']"
            link
            type="primary"
            @click="handleProcessDetail(scope.row)"
          >
            进度
          </el-button>
          <el-button
            v-if="scope.row.status === 1"
            v-hasPermi="['bpm:quality-review:create']"
            link
            type="danger"
            @click="cancelQualityReview(scope.row)"
          >
            取消
          </el-button>
          <el-button
            v-if="scope.row.status !== 1"
            v-hasPermi="['bpm:quality-review:create']"
            link
            type="primary"
            @click="handleReCreate(scope.row)"
          >
            重新发起
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <Pagination
      v-model:limit="queryParams.pageSize"
      v-model:page="queryParams.pageNo"
      :total="total"
      @pagination="getList"
    />
  </ContentWrap>
</template>
<script lang="ts" setup>
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import * as QualityReviewApi from '@/api/bpm/qualityReview'
import * as ProcessInstanceApi from '@/api/bpm/processInstance'
import { useI18n } from 'vue-i18n'

defineOptions({ name: 'BpmQualityReview' })

const message = useMessage() // 消息弹窗
const router = useRouter() // 路由
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref([]) // 列表的数据
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  taskId: undefined,
  initiatorUsername: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref() // 搜索的表单

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await QualityReviewApi.getQualityReviewPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

/** 添加操作 */
const handleCreate = () => {
  router.push({ name: 'QualityReviewCreate' })
}

/** 重新发起操作 */
const handleReCreate = (row: QualityReviewApi.QualityReviewVO) => {
  router.push({
    name: 'QualityReviewCreate',
    query: {
      id: row.id
    }
  })
}

/** 详情操作 */
const handleDetail = (row: QualityReviewApi.QualityReviewVO) => {
  router.push({
    name: 'QualityReviewDetail',
    query: {
      id: row.id
    }
  })
}

/** 取消评审操作 */
const cancelQualityReview = async (row) => {
  // 二次确认
  const { value } = await ElMessageBox.prompt('请输入取消原因', '取消流程', {
    confirmButtonText: t('common.ok'),
    cancelButtonText: t('common.cancel'),
    inputPattern: /^[\s\S]*.*\S[\s\S]*$/, // 判断非空，且非空格
    inputErrorMessage: '取消原因不能为空'
  })
  // 发起取消
  await ProcessInstanceApi.cancelProcessInstanceByStartUser(row.processInstanceId, value)
  message.success('取消成功')
  // 刷新列表
  await getList()
}

/** 审批进度 */
const handleProcessDetail = (row) => {
  router.push({
    name: 'BpmProcessInstanceDetail',
    query: {
      id: row.processInstanceId
    }
  })
}

watch(
  () => router.currentRoute.value,
  () => {
    getList()
  }
)

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>
