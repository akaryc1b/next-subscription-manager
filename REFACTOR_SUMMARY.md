# 订阅系统重构总结

## 重构日期
2026-01-05

## 重构目标
将订阅系统从"配置级订阅"重构为"用户级订阅"，实现以下需求：
1. 每个用户拥有一个订阅链接（而非每个配置一个）
2. 用户可以设置到期时间
3. 普通用户不需要密码（仅管理员需要）
4. 支持封禁用户访问订阅
5. 管理员可以为用户分配多个配置
6. 用户订阅返回所有分配配置的合并YAML

## 数据库变更

### Schema修改 (prisma/schema.prisma)

**User模型变更：**
- `password`: 改为可选字段 `String?`
- 新增 `isBanned`: Boolean字段，默认false
- 新增 `expiresAt`: DateTime?字段，可选
- 新增关系 `userConfigs: UserConfig[]`

**Subscription模型变更：**
- 移除 `configId` 字段
- `userId` 添加 `@unique` 约束（一对一关系）

**新增UserConfig模型：**
```prisma
model UserConfig {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  configId  String   @map("config_id")
  createdAt DateTime @default(now()) @map("created_at")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  config    Config   @relation(fields: [configId], references: [id], onDelete: Cascade)

  @@unique([userId, configId])
  @@map("user_configs")
}
```

## API变更

### 1. 用户API (src/app/api/users/route.ts)

**POST /api/users - 创建用户**
- 支持无密码创建普通用户
- 管理员必须设置密码
- 自动生成订阅token
- 支持 `expiresAt` 和 `isBanned` 字段

**GET /api/users - 获取用户列表**
- 返回数据包含 `isBanned`, `expiresAt`, `subscription.token`

### 2. 用户详情API (src/app/api/users/[id]/route.ts)

**PUT /api/users/[id] - 更新用户**
- 支持更新 `isBanned` 和 `expiresAt` 字段

### 3. 订阅API (src/app/api/subscriptions/route.ts)

**变更：**
- 移除 POST 接口（订阅在创建用户时自动生成）
- GET 接口改为按 `userId` 查询（可选参数）

### 4. 配置分配API (src/app/api/users/[id]/configs/route.ts) - 新增

**GET /api/users/:id/configs**
- 获取用户已分配的配置列表

**POST /api/users/:id/configs**
- 为用户分配配置
- 请求体: `{ configId: string }`

**DELETE /api/users/:id/configs?configId=xxx**
- 移除用户的配置分配

### 5. 订阅访问API (src/app/api/sub/[token]/route.ts)

**GET /api/sub/:token - 重大变更**

新增验证逻辑：
1. 检查用户是否启用 (`isActive`)
2. 检查用户是否被封禁 (`isBanned`)
3. 检查订阅是否过期 (`expiresAt`)
4. 获取用户所有已分配的活跃配置
5. 合并所有配置的YAML内容（proxies, proxy-groups, rules）
6. 返回合并后的YAML文件

错误响应：
- 用户已禁用: 403 "用户已禁用"
- 用户已封禁: 403 "用户已被封禁"
- 订阅已过期: 403 "订阅已过期"
- 无可用配置: 404 "没有可用的配置"

## 前端变更

### 用户管理页面 (src/app/(dashboard)/users/page.tsx)

**User接口更新：**
```typescript
interface User {
  id: string
  username: string
  role: string
  isActive: boolean
  isBanned: boolean          // 新增
  expiresAt: string | null   // 新增
  createdAt: string
  subscription?: {           // 新增
    token: string
  }
}
```

**表格新增列：**
- 到期时间列：显示到期日期或"永久"
- 订阅Token列：显示用户的订阅token

**状态显示优化：**
- 已封禁：红色标签
- 启用：绿色标签
- 禁用：灰色标签

**表单新增字段：**
1. 到期时间：日期选择器（可选）
2. 封禁状态：复选框
3. 密码字段：根据角色动态显示提示
   - 管理员：必填
   - 普通用户：可选

## 业务流程变更

### 旧流程（配置级订阅）
1. 创建配置
2. 为配置创建订阅 → 生成token
3. 用户通过配置的token访问单个配置

### 新流程（用户级订阅）
1. 创建用户 → 自动生成订阅token
2. 创建配置
3. 管理员为用户分配配置（可分配多个）
4. 用户通过个人token访问 → 返回所有分配配置的合并内容

## 测试要点

### 功能测试
- [x] 创建普通用户（无密码）
- [x] 创建管理员（必须有密码）
- [x] 设置用户到期时间
- [x] 封禁/解封用户
- [x] 为用户分配配置
- [x] 移除用户配置
- [x] 访问订阅（正常情况）
- [x] 访问订阅（用户被封禁）
- [x] 访问订阅（订阅已过期）
- [x] 访问订阅（无分配配置）
- [x] YAML合并功能

### API测试
- [x] POST /api/users（无密码创建）
- [x] POST /api/users（管理员创建）
- [x] PUT /api/users/:id（更新到期时间和封禁状态）
- [x] GET /api/users/:id/configs
- [x] POST /api/users/:id/configs
- [x] DELETE /api/users/:id/configs
- [x] GET /api/sub/:token（各种状态验证）

## 兼容性说明

### 破坏性变更
1. **数据库结构变更**：需要重置数据库或手动迁移数据
2. **订阅API变更**：旧的订阅token将失效
3. **前端接口变更**：User类型定义已更新

### 迁移建议
如果有生产数据需要迁移：
1. 备份现有数据库
2. 为每个用户创建订阅记录
3. 将现有的config-subscription关系转换为user-config关系
4. 更新前端代码

## 文件清单

### 修改的文件
- `prisma/schema.prisma` - 数据库Schema
- `src/app/api/users/route.ts` - 用户创建和列表API
- `src/app/api/users/[id]/route.ts` - 用户更新和删除API
- `src/app/api/subscriptions/route.ts` - 订阅列表API
- `src/app/api/sub/[token]/route.ts` - 订阅访问API
- `src/app/(dashboard)/users/page.tsx` - 用户管理页面

### 新增的文件
- `src/app/api/users/[id]/configs/route.ts` - 配置分配API

## 后续优化建议

1. **配置管理页面更新**：添加"分配给用户"功能
2. **监控页面更新**：调整访问日志显示逻辑
3. **批量操作**：支持批量分配配置
4. **配置优先级**：支持配置合并时的优先级设置
5. **订阅统计**：添加用户订阅使用统计
6. **到期提醒**：添加订阅到期提醒功能

## 启动说明

```bash
# 1. 安装依赖（如果需要）
npm install

# 2. 重置数据库（会清空所有数据）
npx prisma db push --force-reset

# 3. 运行种子脚本（创建初始管理员）
npx prisma db seed

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000（或显示的端口）

默认管理员账号：
- 用户名: admin
- 密码: admin123

## 总结

本次重构成功实现了从"配置级订阅"到"用户级订阅"的转变，提供了更灵活的订阅管理方式。用户现在可以：
- 拥有个人订阅链接
- 访问多个配置的合并内容
- 设置到期时间和封禁状态
- 普通用户无需密码即可创建

系统架构更加合理，符合实际使用场景。
