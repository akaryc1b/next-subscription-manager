# Orbit 镜像发布安全修复

## 起因

PR #25 的功能重构已经合并到 `main`（`8a10e1b`），但发布运行 `34075609083` 被镜像安全门禁阻止。其 Trivy 报告列出 9 条 HIGH 命中、8 个不同 CVE：Next.js 3 条、PostCSS 1 条、nanoid 3 条，以及在 libcrypto3/libssl3 中各命中一次的 OpenSSL 漏洞。构建成功不等于可发布。

## 最小版本调整

- Next.js：15.5.18 → 15.5.21，保持 15.x；eslint-config-next 同步到 15.5.21。
- PostCSS：8.5.14 → 8.5.18；旧 override 替换为 `postcss@<8.5.18`，避免传递依赖保留旧版本。
- nanoid：3.x 低于 3.3.18 的依赖统一到 3.3.18，不将 CommonJS 消费者强行迁移到 5.x。
- Alpine：固定 3.24 发行线，构建时要求 libcrypto3/libssl3 至少为 3.5.8-r0。补丁不可获取时构建失败，不忽略漏洞。

`pnpm-lock.yaml` 由 pnpm 10.28.0 实际解析生成并经过 `--frozen-lockfile` 安装验证，不手写 integrity。准备阶段只在修复分支执行，生成的文件先作为 Git blob 保存并核对 SHA；临时准备工作流不包含在最终 PR 文件差异内。

这些是本次报告的修复目标，不声称是所有软件的最新版本，也不把达到版本号当作无漏洞证明。认证逻辑、业务 UI、订阅令牌规则和数据库结构不变。

## 发布检查

1. 所有 PR 都执行生产镜像扫描，不再按 Dockerfile/依赖文件变更过滤，避免应用代码 PR 跳过门禁。分支保护规则应另外将 Scan amd64 image 设为必需检查；运行工作流本身不等于仓库已配置强制保护。
2. 扫描和发布构建拉取基础镜像并重新执行 base 阶段，避免系统包更新被旧构建缓存掩盖。
3. 保留 Trivy 的 HIGH/CRITICAL 拦截政策，包括无修复版本的命中；不加忽略文件，不启用 ignore-unfixed。
4. 报告缺失、JSON 损坏、结果缺失或漏洞字段不完整时失败，不能用空计数放行。门禁附带 11 项独立 Node.js 回归测试。
5. 发布时按 digest 对 amd64、arm64 实际镜像分别复扫，显式设置 TRIVY_PLATFORM，并核对报告的 ImageConfig 架构。只有两个平台都通过，才生成公开多架构 manifest/更新 latest；推送未标记 digest 不等于发布完成。
6. PR 仍运行完整类型检查、Lint、单元测试、Next.js/Docker 构建和现有 38 项 Chromium 浏览器回归。

## 上游依据

- Next.js： https://github.com/vercel/next.js/security/advisories/GHSA-m99w-x7hq-7vfj
- Next.js： https://github.com/vercel/next.js/security/advisories/GHSA-p9j2-gv94-2wf4
- Next.js： https://github.com/vercel/next.js/security/advisories/GHSA-89xv-2m56-2m9x
- PostCSS： https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849
- nanoid 3.3.18： https://github.com/ai/nanoid/releases/tag/3.3.18
- OpenSSL： https://openssl-library.org/news/secadv/20260813.txt
- Trivy 平台选择： https://trivy.dev/docs/latest/target/container_image/#scan-image-on-a-specific-architecture-and-os

OpenSSL 上游对 CVE-2026-14456 评为 Low，本次镜像扫描数据源评为 HIGH；修复和门禁按实际镜像报告执行，不据此断言平台已被攻击或漏洞均可达。

## 验收证据与边界

首轮修复提交 `ffd92af` 的镜像扫描运行 `34091754636` 已报告零 HIGH/CRITICAL；产物 `10007155392` 同时保存报告与真实镜像运行时版本。该镜像中的系统 libcrypto3/libssl3 为 3.5.8-r0，但 Node 24.20.0 的 `process.versions.openssl` 仍为 3.5.7：apk 系统包升级不代表 Node 内置 OpenSSL 同时升级，两者分别记录。此结论不应被扩大成所有漏洞清零或所有组件均已更新。

最终以修复 PR 的最新 SHA 和对应 Actions 运行/产物为准。代码合并、镜像发布与生产服务器实际更新是独立状态；未检查部署服务器时不能宣称线上已升级。原有外部 OAuth、硬件通行密钥与 WebKit/真机验收边界继续保留。
