import request from '@/config/axios'

export type QualityReviewVO = {
  id: number
  status: number
  taskId: string
  initiatorUserId: number
  initiatorUsername: string
  initiatorDeptHeadEmails: string[]
  initiatorDeptHeadUserIds?: number[]
  initiatorDeptHeadUsernames?: string[]
  processInstanceId: string
  createTime: string
  startUserSelectAssignees?: Record<string, number[]>
}

// 创建质检审核流程
export const createQualityReview = async (data: QualityReviewVO) => {
  return await request.post({ url: '/bpm/quality-review/create', data: data })
}

// 获得质检审核流程
export const getQualityReview = async (id: number) => {
  return await request.get({ url: '/bpm/quality-review/get?id=' + id })
}

// 获得质检审核流程分页
export const getQualityReviewPage = async (params: PageParam) => {
  return await request.get({ url: '/bpm/quality-review/page', params })
}
