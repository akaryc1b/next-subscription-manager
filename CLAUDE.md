# Next.js 订阅管理器

[← 根目录](../CLAUDE.md)

> **更新**: 2026-01-15 | Next.js 15 + React 19 + Prisma + Better Auth

---

## 目录结构

```
src/
├── app/
│   ├── (auth)/login, activate/     # 认证页面
│   ├── (dashboard)/                 # dashboard, users, configs, monitor, settings
│   └── api/                         # auth, users, configs, subscriptions, stats, sub
├── components/
│   ├── ui/                          # button, card, input, dialog, dropdown-menu, calendar, popover
│   └── features/                    # sidebar, header, mobile-sidebar
├── lib/                             # prisma, auth, auth-client, utils, theme-utils, motion
├── hooks/                           # use-theme
└── styles/tokens/                   # colors, spacing, typography, shadows, radius, animations
```

---

## API 端点

| 路径 | 说明 |
|------|------|
| `/api/auth/[...all]` | Better Auth |
| `/api/users`, `/api/users/[id]` | 用户CRUD |
| `/api/users/[id]/configs` | 用户配置 |
| `/api/users/[id]/auth-methods` | 认证方式管理 |
| `/api/configs`, `/api/configs/[id]` | 配置CRUD |
| `/api/subscriptions` | 订阅管理 |
| `/api/sub/[token]` | 订阅内容获取 |
| `/api/stats` | 统计数据 |
| `/api/activate/verify, setup` | 用户激活 |

---

## 数据模型 (Prisma)

```
User (id, username, password, email, role, isActive, isBanned, expiresAt)
  ├─ Config (name, content, isActive)
  ├─ Subscription (token) → AccessLog (ip, userAgent, accessedAt)
  ├─ Account (providerId, accessToken)
  ├─ Session (token, expiresAt)
  ├─ ActivationToken (token, expiresAt, used)
  └─ Passkey (publicKey, credentialID)
```

---

## 认证流程

**登录**: 密码 / Passkey / GitHub OAuth → Better Auth Session

**激活**: 管理员创建用户 → 激活令牌 → `/activate?token=xxx` → 选择认证方式

---

## 命令

```bash
pnpm dev              # 开发
pnpm build            # 构建
pnpm db:generate      # Prisma客户端
pnpm db:push          # 推送Schema
pnpm db:seed          # 种子数据
npx prisma studio     # 数据库GUI
docker-compose up -d  # Docker部署
```

---

## 环境变量

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="xxx"
BETTER_AUTH_URL="http://localhost:3000"
GITHUB_CLIENT_ID/SECRET (可选)
```

---

## 开发要点

- **Server Components** 优先，需要交互时用 `'use client'`
- **样式**: 使用 `src/styles/tokens/` 中的 Design Tokens
- **API**: 返回 `NextResponse.json()` + HTTP状态码
- **数据库**: 通过 `src/lib/prisma.ts` 单例访问
