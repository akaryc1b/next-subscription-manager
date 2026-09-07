# 管理员登录与订阅交付

## 产品边界

订阅账户代表配置授权、有效期及访问额度，不代表系统登录身份。仅启用、未封禁的管理员可以登录；普通用户直接导入订阅链接。新建普通用户不创建 ActivationToken、Account 或 Session，接口不返回 activationLink。管理员仍在创建时设置强密码。

## 旧数据

旧激活 verify/setup 固定返回 410，不解析请求、查找 token、返回邮箱或创建凭据。旧激活页不把查询令牌作为组件参数，也不发起验证请求。保留原表以免要求破坏性数据库迁移；这不意味着旧链接仍可用。已有普通用户的认证会话在 auth 路由被拒绝，get-session 返回 null。后台和管理 API 的角色守卫继续保留。

管理员可以从旧用户 cookie 中重新登录，也可退出旧会话。普通用户的订阅令牌、额度、分配关系不受影响。升级普通用户为管理员需要新密码，并在同一事务内清理其旧 Account/Passkey 绑定和会话；旧用户自行设置的认证方式不会因此获得管理员权限。旧手工 GitHub ID 绑定入口不再写库，管理员使用设置页的正式 OAuth 流程。

## OAuth 与并发写入边界

Better Auth 1.6.9 的 OAuth 回调在创建会话之前可能新增 Account、刷新 OAuth token 或更新验证状态；显式绑定回调甚至不会创建新会话。仅使用 session.create 钩子不足以拦住这些写入。

`admin-auth-adapter.ts` 的资格查询使用参数化 SELECT FOR UPDATE，在同一 PostgreSQL 事务中锁定 User、核对当前角色/状态，并用绑定到该事务的 Prisma adapter 完成认证写入。资格不是事务外单独读取的，也不在另一个连接上写入。Account 新增/更新/批量更新、User 更新、Passkey/Session 新增受此约束；session 钩子仍用于提前拒绝。并发角色/状态 UPDATE 必须先于校验完成，或等待这次已授权的写入提交，消除校验与写入之间的窗口。

Account 更新按实际记录所有者或严格 AND userId 条件定位，拒绝跨所有者改写、宽泛 OR 及重复所有者条件。已有 adapter 事务继续复用原事务和行锁，嵌套操作不能越过回滚边界。业务管理接口使用原 Prisma client，其 User UPDATE 的数据库行锁与认证检查冲突，不依赖进程内互斥。不存在降低数据库隔离或关闭生产限流的配置。

OAuth 专项复用生产 auth.options，执行真实 state 生成、签名 cookie、回调及数据库读写；仅 GitHub token/profile/emails HTTP 响应使用夹具。覆盖隐式同邮箱绑定、已有绑定 token 更新、先获准 link-social 后停用/封禁/降级再返回（包括无 session cookie），并保留正常管理员新旧绑定的正向对照。这不等于真实 GitHub 网站端到端或硬件认证验收。

并发专项使用独立事务持有停用更新，通过 pg_blocking_pids 确认认证写入真正等待数据库锁，然后提交停用，验证绑定新增/更新与会话新增均拒绝；不以 sleep 猜测竞争是否发生。另验证管理员改名、改密码和 adapter 事务回滚。

## 列表

账户默认按创建时间倒序，ID 作为确定性并列排序。到期日程显式指定 sort=expires，按到期时间排序；关注队列保留到期优先。

## 验收边界

测试只允许隔离的本地 workspace_e2e 数据库，按精确 ID 清理夹具。不访问生产数据库、不使用对话中的真实令牌。创建成功页保留手势安全的 Shadowrocket 复制，失败可重试，不消费订阅额度。代码合并不等于生产部署；旧实例必须更新后才应用新边界。
