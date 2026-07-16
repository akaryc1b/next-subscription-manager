# Subscription 订阅管理器

基于Next.js 15全栈架构。

## ✨ 功能特性

- 🔐 **多种认证方式** - 支持邮箱密码、Passkey（WebAuthn）、GitHub OAuth
- 👥 **用户管理** - 完整的用户CRUD、权限控制、到期时间管理
- ⚙️ **配置管理** - YAML配置编辑、启用/禁用、订阅链接生成
- 📊 **监控中心** - 实时统计数据、访问日志、用户筛选
- 🎨 **现代UI** - shadcn/ui组件库、深色主题、响应式设计
- 🐳 **容器化部署** - Docker Compose一键部署

## 🛠️ 技术栈

**前端**
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 3
- shadcn/ui + Radix UI

**后端**
- Next.js API Routes
- Better Auth (认证系统)
- Prisma ORM
- PostgreSQL 16

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm
- PostgreSQL 16

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd Subscription_订阅管理器开发/next-subscription-manager
```

2. **安装依赖**
```bash
pnpm install
```

3. **配置环境变量**
```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/subscription_db"
BETTER_AUTH_SECRET="your-random-secret-key"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# GitHub OAuth (可选)
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

4. **初始化数据库**
```bash
pnpm db:generate
pnpm db:push
```

5. **创建管理员账号**
```bash
npx tsx scripts/create-admin-auth.ts
```

6. **启动开发服务器**
```bash
pnpm dev
```

访问 http://localhost:3000

## 🐳 Docker部署

```bash
cd next-subscription-manager
docker-compose up -d
```

服务将在 http://localhost:3000 启动。

## 📝 开发指南

### 数据库管理

```bash
# 生成Prisma客户端
pnpm db:generate

# 推送Schema到数据库
pnpm db:push

# 创建迁移
pnpm db:migrate

# 打开Prisma Studio
npx prisma studio
```

### 项目结构

```
next-subscription-manager/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── (auth)/       # 认证页面
│   │   ├── (dashboard)/  # 仪表板页面
│   │   └── api/          # API路由
│   ├── components/       # React组件
│   │   ├── ui/           # shadcn/ui组件
│   │   └── features/     # 业务组件
│   └── lib/              # 工具库
├── prisma/               # 数据库Schema
└── scripts/              # 脚本工具
```

## 🔑 认证方式

### 邮箱密码登录
使用Better Auth的邮箱密码认证，密码由Better Auth的内置哈希策略处理。

### Passkey登录
基于WebAuthn标准的无密码认证，支持生物识别和安全密钥。

### GitHub OAuth
通过GitHub账号快速登录，支持账号链接。

## 📖 API文档

### 认证端点
- `POST /api/auth/sign-in/email` - 邮箱密码登录
- `POST /api/auth/passkey/register` - 注册Passkey
- `POST /api/auth/passkey/authenticate` - Passkey登录
- `GET /api/auth/github` - GitHub OAuth

### 用户管理
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `GET /api/users/[id]` - 获取用户详情
- `PUT /api/users/[id]` - 更新用户
- `DELETE /api/users/[id]` - 删除用户

### 配置管理
- `GET /api/configs` - 获取配置列表
- `POST /api/configs` - 创建配置
- `PUT /api/configs/[id]` - 更新配置
- `DELETE /api/configs/[id]` - 删除配置

### 订阅
- `GET /api/sub/[token]` - 获取订阅内容

## 🔒 安全特性

- ✅ Better Auth会话管理
- ✅ Better Auth密码哈希
- ✅ Prisma ORM防SQL注入
- ✅ 环境变量隔离
- ✅ HTTPS就绪
- ✅ CORS配置

## 📄 许可证

本项目用于学习和演示目的。

## 🤝 贡献

欢迎提交Issue和Pull Request！

## 📮 联系方式

如有问题或建议，请提交Issue。
