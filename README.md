# Subscription 订阅管理器

基于 Next.js 15 的全栈订阅管理系统。

## ✨ 功能特性

- 🔐 **多种认证方式** - 支持邮箱密码、Passkey（WebAuthn）、GitHub OAuth
- 👥 **用户管理** - 用户 CRUD、权限控制、到期时间和会话撤销
- ⚙️ **配置管理** - YAML 配置编辑、启用/禁用、订阅链接生成
- 📊 **监控中心** - 实时统计、访问日志和安全事件
- 📱 **响应式后台** - 桌面侧栏与移动端底部导航
- 🐳 **容器化部署** - Docker Compose 部署与数据库备份

## 🛠️ 技术栈

**前端**
- Next.js 15（App Router）
- React 19
- TypeScript 5
- Tailwind CSS 3
- shadcn/ui + Radix UI

**后端**
- Next.js API Routes
- Better Auth
- Prisma ORM
- PostgreSQL 16

## 🚀 快速开始

### 前置要求

- Node.js 22+
- pnpm
- PostgreSQL 16

### 安装步骤

1. 克隆项目

```bash
git clone <repository-url>
cd next-subscription-manager
```

2. 安装依赖

```bash
pnpm install
```

3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/subscription_db"
BETTER_AUTH_SECRET="replace-with-at-least-32-random-characters"
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_TRUSTED_ORIGINS="http://localhost:3000"

ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="replace-with-a-strong-password"
ADMIN_NAME="Admin"

# GitHub OAuth（可选）
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

4. 初始化数据库

```bash
pnpm db:generate
pnpm db:migrate:deploy
```

开发环境也可使用：

```bash
pnpm db:push
```

5. 创建管理员账号

```bash
pnpm db:seed
```

6. 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:3000`。

## 🐳 Docker 部署

```bash
docker compose up -d
```

生产应用容器以非 root 用户运行，并启用 `no-new-privileges`、移除 Linux capabilities。管理员初始化密码仅供独立 seed 操作使用，不注入应用运行容器。

启用每日数据库备份：

```bash
docker compose --profile backup up -d postgres-backup
```

备份默认保留 7 天，文件仅允许创建者读取。

## 📝 开发命令

```bash
pnpm db:generate       # 生成 Prisma Client
pnpm db:migrate        # 创建开发迁移
pnpm db:migrate:deploy # 部署已有迁移
pnpm typecheck         # TypeScript 检查
pnpm lint              # ESLint
pnpm test              # Vitest
pnpm build             # 生产构建
```

## 🔑 认证与权限

### 邮箱密码

邮箱密码由 Better Auth 的密码哈希实现处理。新设置或管理员重置的密码至少需要 12 个字符。

同一账号或 IP 在 15 分钟内连续失败 5 次后，邮箱密码登录会暂时受限。限流状态记录在数据库中，支持多实例部署。

### Passkey

登录页支持已注册的 Passkey。普通用户首次激活账户时先设置密码，登录后再从设置页面注册 Passkey。

### GitHub OAuth

仅允许已绑定账号登录，禁止通过 OAuth 隐式注册新用户。

### 管理员权限

后台页面和管理 API 均在服务端校验管理员角色、启用状态和封禁状态。系统阻止删除、禁用或降级最后一个可用管理员，也阻止当前管理员误锁定自己。

权限、账号状态、邮箱或密码发生变化时，该用户的现有会话会被撤销。

## 🔗 订阅 Token 规则

- 订阅 Token **默认永久有效**，不会自动到期。
- 只有管理员手动执行“刷新/轮换 Token”时才生成新 Token。
- 新 Token 写入数据库后，原 Token **立即失效**。
- Token 轮换不会重置 `accessCount` 或 `maxAccess`。
- 系统记录 `tokenRotatedAt`，用于审计最近轮换时间。
- 订阅响应使用 `no-store`，并在原子增加访问次数时再次校验 Token，避免并发轮换后旧请求继续成功。

相关接口：

- `GET /api/sub/[token]` - 获取订阅内容
- `GET /api/users/[id]/subscription` - 获取订阅详情与 Token 策略
- `PATCH /api/users/[id]/subscription` - 修改访问次数上限
- `POST /api/users/[id]/subscription/reset` - 管理员手动轮换 Token

## 📖 管理 API

### 用户管理

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/[id]`
- `DELETE /api/users/[id]`

### 配置管理

- `GET /api/configs`
- `POST /api/configs`
- `PUT /api/configs/[id]`
- `DELETE /api/configs/[id]`

### 监控

- `GET /api/stats`
- `GET /api/logs`
- `GET /api/security-events`

## 🔒 安全措施

- Better Auth 会话和密码哈希
- 服务端管理员页面/API 权限守卫
- Zod 请求参数校验
- Prisma ORM 与数据库约束
- 登录防爆破限流
- 激活 Token 原子消费
- 订阅 Token 高强度随机生成和立即轮换失效
- CSP、点击劫持保护、权限策略和生产 HSTS
- 非 root、最小权限 Docker 运行环境
- 安全事件审计日志

## 📄 许可证

本项目用于学习和演示目的。
