// Polyfill for crypto in Node.js (required by Better Auth)
import { webcrypto } from 'crypto'
if (typeof globalThis.crypto === 'undefined') {
  // @ts-ignore
  globalThis.crypto = webcrypto
}

import { auth } from '../src/lib/auth'
import { prisma } from '../src/lib/prisma'

async function main() {
  // 强制读取环境变量
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  const adminName = process.env.ADMIN_NAME || 'Admin'

  if (!adminEmail || !adminPassword) {
    console.error('❌ 错误: 缺少必需的环境变量')
    console.error('请在.env文件中设置:')
    console.error('  ADMIN_EMAIL=your-email@example.com')
    console.error('  ADMIN_PASSWORD=your-secure-password')
    console.error('  ADMIN_NAME=Admin (可选)')
    process.exit(1)
  }

  console.log('🚀 开始初始化数据库...')

  try {
    // 检查管理员是否已存在
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    })

    if (existingAdmin) {
      console.log('✅ 管理员账号已存在')
      console.log(`   邮箱: ${adminEmail}`)
      return
    }

    // 使用Better Auth创建管理员
    await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      },
    })

    // 更新为管理员角色
    await prisma.user.update({
      where: { email: adminEmail },
      data: {
        role: 'admin',
        username: adminName.toLowerCase(),
      },
    })

    console.log('✅ 管理员账号创建成功')
    console.log(`   邮箱: ${adminEmail}`)
    console.log(`   用户名: ${adminName.toLowerCase()}`)
    console.log('⚠️  请妥善保管密码！')
  } catch (error: any) {
    console.error('❌ 创建失败:', error.message)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    console.error('❌ 初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
