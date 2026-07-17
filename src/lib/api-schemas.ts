import { z } from 'zod'

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const dateStringSchema = z.string().trim().refine(value => {
  return !Number.isNaN(Date.parse(value))
}, '日期格式无效')

export const optionalNullableDateSchema = z.preprocess(value => {
  if (value === '' || value === null) return null
  return value
}, dateStringSchema.transform(value => new Date(value)).nullable().optional())

export const userRoleSchema = z.enum(['user', 'admin'])

const optionalPasswordSchema = z.preprocess(value => {
  if (typeof value === 'string' && value.trim() === '') return undefined
  return value
}, z.string()
  .min(12, '密码至少 12 个字符')
  .max(128, '密码最多 128 个字符')
  .optional())

export const userCreateSchema = z.object({
  email: z.email('邮箱格式无效').trim().toLowerCase(),
  password: optionalPasswordSchema,
  role: userRoleSchema.default('user'),
  expiresAt: optionalNullableDateSchema,
  configIds: z.array(z.uuid('配置 ID 无效')).default([]),
}).superRefine((data, ctx) => {
  if (data.role === 'admin' && !data.password) {
    ctx.addIssue({ code: 'custom', path: ['password'], message: '管理员必须设置密码' })
  }
})

export const userUpdateSchema = z.object({
  email: z.email('邮箱格式无效').trim().toLowerCase().optional(),
  password: optionalPasswordSchema,
  role: userRoleSchema.optional(),
  isActive: z.boolean().optional(),
  isBanned: z.boolean().optional(),
  expiresAt: optionalNullableDateSchema,
  configIds: z.array(z.uuid('配置 ID 无效')).optional(),
})

export const configCreateSchema = z.object({
  userId: z.uuid('用户 ID 无效'),
  name: z.string().trim().min(1, '名称不能为空').max(120, '名称最多 120 个字符'),
  content: z.string().trim().min(1, '内容不能为空'),
})

export const configUpdateSchema = z.object({
  name: z.string().trim().min(1, '名称不能为空').max(120, '名称最多 120 个字符').optional(),
  content: z.string().trim().min(1, '内容不能为空').optional(),
  isActive: z.boolean().optional(),
})

export function formatZodError(error: z.ZodError) {
  return error.issues[0]?.message || '请求参数无效'
}
