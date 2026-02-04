<template>
  <el-row :gutter="20">
    <el-col :span="16">
      <ContentWrap title="申请信息">
        <el-form
          ref="formRef"
          v-loading="formLoading"
          :model="formData"
          :rules="formRules"
          label-width="100px"
        >
          <el-form-item label="任务ID" prop="taskId">
            <el-input v-model="formData.taskId" placeholder="请输入任务ID" />
          </el-form-item>
          <el-form-item label="发起人" prop="initiatorUsername">
            <el-input v-model="formData.initiatorUsername" disabled />
          </el-form-item>
          <el-form-item label="部门负责人" prop="initiatorDeptHeadUsernames">
            <el-input
              v-model="deptHeadNamesStr"
              placeholder="请选择部门负责人"
              readonly
              @click="openUserSelect"
            >
              <template #append>
                <el-button icon="ep:search" @click="openUserSelect" />
              </template>
            </el-input>
          </el-form-item>
          <el-form-item>
            <el-button :disabled="formLoading" type="primary" @click="submitForm">
              确 定
            </el-button>
          </el-form-item>
        </el-form>
      </ContentWrap>
    </el-col>

    <!-- 审批相关：流程信息 -->
    <el-col :span="8">
      <ContentWrap title="审批流程" :bodyStyle="{ padding: '0 20px 0' }">
        <ProcessInstanceTimeline
          ref="timelineRef"
          :activity-nodes="activityNodes"
          :show-status-icon="false"
          @select-user-confirm="selectUserConfirm"
        />
      </ContentWrap>
    </el-col>
  </el-row>

  <!-- 用户选择弹窗 -->
  <UserSelectForm ref="userSelectRef" @confirm="handleUserSelectConfirm" />
</template>
<script lang="ts" setup>
import * as QualityReviewApi from '@/api/bpm/qualityReview'
import { useTagsViewStore } from '@/store/modules/tagsView'
import { useUserStore } from '@/store/modules/user'
import UserSelectForm from '@/components/UserSelectForm/index.vue'

// 审批相关：import
import * as DefinitionApi from '@/api/bpm/definition'
import ProcessInstanceTimeline from '@/views/bpm/processInstance/detail/ProcessInstanceTimeline.vue'
import * as ProcessInstanceApi from '@/api/bpm/processInstance'
import { CandidateStrategy, NodeId } from '@/components/SimpleProcessDesignerV2/src/consts'
import { ApprovalNodeInfo } from '@/api/bpm/processInstance'

defineOptions({ name: 'QualityReviewCreate' })

const message = useMessage() // 消息弹窗
const { delView } = useTagsViewStore() // 视图操作
const { push, currentRoute } = useRouter() // 路由
const { query } = useRoute() // 查询参数
const userStore = useUserStore() // 用户信息

const formLoading = ref(false) // 表单的加载中
const formData = ref({
  taskId: undefined,
  initiatorUserId: userStore.getUser.id,
  initiatorUsername: userStore.getUser.nickname,
  initiatorDeptHeadEmails: [],
  initiatorDeptHeadUserIds: [],
  initiatorDeptHeadUsernames: []
})
const deptHeadNamesStr = computed(() => formData.value.initiatorDeptHeadUsernames?.join(', '))

const formRules = reactive({
  taskId: [{ required: true, message: '任务ID不能为空', trigger: 'blur' }],
  initiatorDeptHeadUsernames: [{ required: true, message: '部门负责人不能为空', trigger: 'change' }]
})
const formRef = ref() // 表单 Ref
const userSelectRef = ref() // 用户选择 Ref

// 审批相关：变量
const processDefineKey = 'qualityReviewProcess' // 流程定义 Key
const startUserSelectTasks = ref([]) // 发起人需要选择审批人的用户任务列表
const startUserSelectAssignees = ref({}) // 发起人选择审批人的数据
const tempStartUserSelectAssignees = ref({}) // 历史发起人选择审批人的数据，用于每次表单变更时，临时保存
const activityNodes = ref<ProcessInstanceApi.ApprovalNodeInfo[]>([]) // 审批节点信息
const processDefinitionId = ref('')

/** 打开用户选择弹窗 */
const openUserSelect = () => {
  const selectedList = formData.value.initiatorDeptHeadUserIds.map((id, index) => ({
    id,
    nickname: formData.value.initiatorDeptHeadUsernames[index]
  }))
  userSelectRef.value.open(null, selectedList)
}

/** 用户选择确认 */
const handleUserSelectConfirm = (_, userList) => {
  formData.value.initiatorDeptHeadUserIds = userList.map((u) => u.id)
  formData.value.initiatorDeptHeadUsernames = userList.map((u) => u.nickname)
  formData.value.initiatorDeptHeadEmails = userList.map((u) => u.email || '')
  // 触发校验
  formRef.value.validateField('initiatorDeptHeadUsernames')
}

/** 提交表单 */
const submitForm = async () => {
  // 1.1 校验表单
  if (!formRef) return
  const valid = await formRef.value.validate()
  if (!valid) return
  // 1.2 审批相关：校验指定审批人
  if (startUserSelectTasks.value?.length > 0) {
    for (const userTask of startUserSelectTasks.value) {
      if (
        Array.isArray(startUserSelectAssignees.value[userTask.id]) &&
        startUserSelectAssignees.value[userTask.id].length === 0
      ) {
        return message.warning(`请选择${userTask.name}的审批人`)
      }
    }
  }

  // 2. 提交请求
  formLoading.value = true
  try {
    const data = { ...formData.value } as unknown as QualityReviewApi.QualityReviewVO
    // 审批相关：设置指定审批人
    if (startUserSelectTasks.value?.length > 0) {
      data.startUserSelectAssignees = startUserSelectAssignees.value
    }
    await QualityReviewApi.createQualityReview(data)
    message.success('发起成功')
    // 关闭当前 Tab
    delView(unref(currentRoute))
    await push({ name: 'BpmQualityReview' })
  } finally {
    formLoading.value = false
  }
}

/** 审批相关：获取审批详情 */
const getApprovalDetail = async () => {
  try {
    const data = await ProcessInstanceApi.getApprovalDetail({
      processDefinitionId: processDefinitionId.value,
      activityId: NodeId.START_USER_NODE_ID,
      processVariablesStr: JSON.stringify({})
    })

    if (!data) {
      message.error('查询不到审批详情信息！')
      return
    }
    // 获取审批节点，显示 Timeline 的数据
    activityNodes.value = data.activityNodes

    // 获取发起人自选的任务
    startUserSelectTasks.value = data.activityNodes?.filter(
      (node: ApprovalNodeInfo) => CandidateStrategy.START_USER_SELECT === node.candidateStrategy
    )
    // 恢复之前的选择审批人
    if (startUserSelectTasks.value?.length > 0) {
      for (const node of startUserSelectTasks.value) {
        if (
          tempStartUserSelectAssignees.value[node.id] &&
          tempStartUserSelectAssignees.value[node.id].length > 0
        ) {
          startUserSelectAssignees.value[node.id] = tempStartUserSelectAssignees.value[node.id]
        } else {
          startUserSelectAssignees.value[node.id] = []
        }
      }
    }
  } finally {
  }
}

/** 审批相关：选择发起人 */
const selectUserConfirm = (id: string, userList: any[]) => {
  startUserSelectAssignees.value[id] = userList?.map((item: any) => item.id)
}

/** 获取评审数据，用于重新发起时自动填充 */
const getDetail = async (id: number) => {
  try {
    formLoading.value = true
    const data = await QualityReviewApi.getQualityReview(id)
    if (!data) {
      message.error('重新发起质检失败，原因：质检数据不存在')
      return
    }
    formData.value = {
      taskId: data.taskId,
      initiatorUserId: data.initiatorUserId,
      initiatorUsername: data.initiatorUsername,
      initiatorDeptHeadEmails: data.initiatorDeptHeadEmails || [],
      initiatorDeptHeadUserIds: data.initiatorDeptHeadUserIds || [],
      initiatorDeptHeadUsernames: data.initiatorDeptHeadUsernames || []
    }
  } finally {
    formLoading.value = false
  }
}

/** 初始化 */
onMounted(async () => {
  const processDefinitionDetail = await DefinitionApi.getProcessDefinition(
    undefined,
    processDefineKey
  )

  if (!processDefinitionDetail) {
    message.error('质检审核的流程模型未配置，请检查！')
    return
  }
  processDefinitionId.value = processDefinitionDetail.id
  startUserSelectTasks.value = processDefinitionDetail.startUserSelectTasks

  // 如果有业务编号，说明是重新发起，需要加载原有数据
  if (query.id) {
    await getDetail(Number(query.id))
  }

  // 审批相关：加载最新的审批详情，主要用于节点预测
  await getApprovalDetail()
})

/** 审批相关：预测流程节点会因为输入的参数值而产生新的预测结果值，所以需重新预测一次 */
watch(
  formData.value,
  (newValue, oldValue) => {
    if (!oldValue) {
      return
    }
    if (newValue && Object.keys(newValue).length > 0) {
      // 记录之前的节点审批人
      tempStartUserSelectAssignees.value = startUserSelectAssignees.value
      startUserSelectAssignees.value = {}
      // 加载最新的审批详情,主要用于节点预测
      getApprovalDetail()
    }
  },
  {
    immediate: true
  }
)
</script>
