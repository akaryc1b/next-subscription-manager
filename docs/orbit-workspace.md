# Orbit 工作空间：实现与验收边界

## 实际任务

仓库交付订阅配置。工作台围绕访问条件、配置授权、链接交付和请求追溯组织，不伪装成通用节点监控。账户状态和访问记录来自现有数据模型，当前配置不能当作历史分发快照。

工作台的返回次数和安全提醒标明近24小时窗口；趋势按UTC自然日聚合且当天未结束；到期按准确时刻判断、按本地日期显示。`可分发`只描述账户、额度和已启用配置条件，不意味着节点连通。

## 入口到管理的连续体验

登录、激活与设置复用 Orbit 的品牌、色彩、输入框、状态反馈和按钮。登录入口明确面向管理员；未配置GitHub OAuth时不提供无效登录按钮。通行密钥能力检测只代表当前浏览器环境支持，不代表已注册密钥。

激活页保留验证中、验证失败、密码设置和完成状态。验证失败可重试；缺少令牌不显示可提交表单；链接验证请求有取消保护。完成后说明订阅链接由管理员交付，不自动把普通用户送进受限后台。

设置移除了原通知、数据占位区与无实际效果的旧主题风格切换，保留身份、认证、会话、明暗模式。名称更新、密码更新、认证方式绑定与解除、会话退出均检查服务端响应。密码修改使用Better Auth的当前密码校验和退出其他会话选项，服务端新密码长度与12–128字符的界面规则一致。最后一种认证方式仍受现有服务端规则保护。

会话只显示客户端描述、IP、登录和到期时间，不展示令牌，也不把存在会话当作设备在线。解除全部通行密钥时明确说明影响范围。

## 编辑与导航

额度表单的按钮和回车均只提交额度API，不再落到账户更新操作。写入时禁用相关输入与操作，错误会留在当前表单。

`useUnsaved`只登记编辑状态，不存储表单内容。内部链接与命令面板入口在编辑未保存时受到保护；跨文档退出使用原生beforeunload。`HistoryGuard`为应用拥有的history记录附加索引，保留Next.js原状态，在未保存时反向恢复历史导航，让编辑组件保持挂载。取消或保存后恢复正常导航。它不声称控制外部页面的历史记录或操作系统强制关闭。

## 工程边界

`/api/workspace`保留管理员只读权限、分页与时间范围限制，列表不返回订阅token。配置进入编辑后才加载YAML。原写接口、数据库结构、激活令牌消费机制、订阅令牌规则不变。

本地SVG不代表实时拓扑。CSS装饰动效和Motion都需要遵循`prefers-reduced-motion`；浏览器测试实际切换系统偏好，检查装饰动画停止与重新启用。

依赖API的设计依据：
- Better Auth 用户与密码操作：https://better-auth.com/docs/concepts/users-accounts
- Better Auth 会话管理：https://better-auth.com/docs/concepts/session-management
- Next.js App Router导航：https://nextjs.org/docs/app/api-reference/functions/use-router
- CSS减少动态偏好：https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion

## 验收运行

基础检查为`pnpm db:generate`、`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`及Docker构建。

现有`Workspace browser acceptance`工作流使用本地临时PostgreSQL、真实登录和standalone生产构建。测试脚本不会连接部署数据库。运行完整套件时，`workspace.e2e.mjs`先建立真实认证状态，`z-product.e2e.mjs`复用该测试会话，避免连续登录触发限流。

原工作空间回归覆盖授权、五个核心页面、搜索、账户创建交付、额度、YAML、取消删除、读取失败和剪贴板拒绝。新增回归覆盖登录与设置的桌面/手机尺寸、密码显隐、邀请异常与重试、主题持久化、认证读取失败、额度回车、前进/后退和CSS减少动态。

截图和报告上传为`orbit-browser-evidence`。它们来自测试夹具，不是生产数据。当前工作流仍以Chromium运行；不将其称为WebKit、iPhone真机或硬件密钥验收。外部GitHub授权、真实硬件通行密钥、新增设置写操作的完整端到端覆盖，需要与已通过的界面测试明确区分。
