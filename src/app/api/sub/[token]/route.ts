import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientIp, maskToken, recordSecurityEvent } from '@/lib/security-events'
import yaml from 'js-yaml'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const subscription = await prisma.subscription.findUnique({
      where: { token },
      include: {
        user: {
          include: {
            userConfigs: {
              include: {
                config: true,
              },
            },
          },
        },
      },
    })

    if (!subscription) {
      await recordSecurityEvent(request, {
        type: 'subscription_token_invalid',
        severity: 'warning',
        statusCode: 404,
        identifier: maskToken(token),
        message: '访问不存在的订阅 token',
      })

      return NextResponse.json(
        { error: '订阅不存在' },
        { status: 404 }
      )
    }

    const user = subscription.user

    if (!user.isActive) {
      await recordSecurityEvent(request, {
        type: 'subscription_denied',
        severity: 'warning',
        statusCode: 403,
        userId: user.id,
        identifier: maskToken(token),
        message: '禁用用户的订阅被访问',
        metadata: {
          reason: 'user_inactive',
        },
      })

      return NextResponse.json(
        { error: '用户已禁用' },
        { status: 403 }
      )
    }

    if (user.isBanned) {
      await recordSecurityEvent(request, {
        type: 'subscription_denied',
        severity: 'critical',
        statusCode: 403,
        userId: user.id,
        identifier: maskToken(token),
        message: '封禁用户的订阅被访问',
        metadata: {
          reason: 'user_banned',
        },
      })

      return NextResponse.json(
        { error: '用户已被封禁' },
        { status: 403 }
      )
    }

    if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
      await recordSecurityEvent(request, {
        type: 'subscription_denied',
        severity: 'warning',
        statusCode: 403,
        userId: user.id,
        identifier: maskToken(token),
        message: '过期用户的订阅被访问',
        metadata: {
          reason: 'subscription_expired',
          expiresAt: user.expiresAt,
        },
      })

      return NextResponse.json(
        { error: '订阅已过期' },
        { status: 403 }
      )
    }

    // 检查访问次数限制
    if (subscription.maxAccess > 0 && subscription.accessCount >= subscription.maxAccess) {
      await recordSecurityEvent(request, {
        type: 'subscription_denied',
        severity: 'warning',
        statusCode: 403,
        userId: user.id,
        identifier: maskToken(token),
        message: '订阅访问次数达到上限后仍被访问',
        metadata: {
          reason: 'access_limit_exceeded',
          maxAccess: subscription.maxAccess,
          accessCount: subscription.accessCount,
        },
      })

      return NextResponse.json(
        { error: '订阅访问次数已达上限，请联系管理员重置' },
        { status: 403 }
      )
    }

    const activeConfigs = user.userConfigs
      .map(uc => uc.config)
      .filter(config => config.isActive)

    if (activeConfigs.length === 0) {
      return NextResponse.json(
        { error: '没有可用的配置' },
        { status: 404 }
      )
    }

    // 方案 A：首配置为基础模板，保留所有字段（dns, mixed-port, rule-providers 等）
    // 后续配置只合并列表和 provider 字段
    let mergedConfig: any = null
    const listFields = ['proxies', 'proxy-groups', 'rules']
    const providerFields = ['rule-providers', 'proxy-providers']

    for (const config of activeConfigs) {
      try {
        const parsed: any = yaml.load(config.content)

        if (!parsed || typeof parsed !== 'object') {
          continue
        }

        if (!mergedConfig) {
          // 第一个配置作为基础模板，保留所有字段
          mergedConfig = { ...parsed }
          // 确保需要追加的列表字段存在
          for (const field of listFields) {
            if (!Array.isArray(mergedConfig[field])) {
              mergedConfig[field] = []
            }
          }
          // 确保 provider 字段可按键合并
          for (const field of providerFields) {
            if (!mergedConfig[field] || typeof mergedConfig[field] !== 'object' || Array.isArray(mergedConfig[field])) {
              mergedConfig[field] = {}
            }
          }
        } else {
          // 后续配置只追加列表字段
          if (parsed.proxies && Array.isArray(parsed.proxies)) {
            mergedConfig.proxies.push(...parsed.proxies)
          }
          if (parsed['proxy-groups'] && Array.isArray(parsed['proxy-groups'])) {
            mergedConfig['proxy-groups'].push(...parsed['proxy-groups'])
          }
          if (parsed.rules && Array.isArray(parsed.rules)) {
            mergedConfig.rules.push(...parsed.rules)
          }
          // rule-providers 和 proxy-providers 是对象，需要合并键
          if (parsed['rule-providers'] && typeof parsed['rule-providers'] === 'object') {
            mergedConfig['rule-providers'] = {
              ...mergedConfig['rule-providers'],
              ...parsed['rule-providers'],
            }
          }
          if (parsed['proxy-providers'] && typeof parsed['proxy-providers'] === 'object') {
            mergedConfig['proxy-providers'] = {
              ...mergedConfig['proxy-providers'],
              ...parsed['proxy-providers'],
            }
          }
        }
      } catch (e) {
        console.error(`Failed to parse config ${config.name}:`, e)
      }
    }

    // 兜底：如果所有配置解析失败
    if (!mergedConfig) {
      return NextResponse.json(
        { error: '配置解析失败' },
        { status: 500 }
      )
    }

    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || undefined

    // 更新访问计数并记录访问日志
    const accessGranted = await prisma.$transaction(async tx => {
      const updateResult = subscription.maxAccess > 0
        ? await tx.subscription.updateMany({
            where: {
              id: subscription.id,
              accessCount: {
                lt: subscription.maxAccess,
              },
            },
            data: { accessCount: { increment: 1 } },
          })
        : await tx.subscription.updateMany({
            where: { id: subscription.id },
            data: { accessCount: { increment: 1 } },
          })

      if (updateResult.count !== 1) {
        return false
      }

      await tx.accessLog.create({
        data: {
          subscriptionId: subscription.id,
          ipAddress: ip,
          userAgent,
        },
      })

      return true
    })

    if (!accessGranted) {
      await recordSecurityEvent(request, {
        type: 'subscription_denied',
        severity: 'warning',
        statusCode: 403,
        userId: user.id,
        identifier: maskToken(token),
        message: '订阅访问次数在并发访问中达到上限',
        metadata: {
          reason: 'access_limit_exceeded_atomic',
          maxAccess: subscription.maxAccess,
          accessCount: subscription.accessCount,
        },
      })

      return NextResponse.json(
        { error: '订阅访问次数已达上限，请联系管理员重置' },
        { status: 403 }
      )
    }

    const yamlContent = yaml.dump(mergedConfig)
    // 使用邮箱的用户名部分作为文件名
    const emailPrefix = user.email.split('@')[0]
    const cleanFilename = emailPrefix.replace(/[^\w\-]/g, '_')

    return new NextResponse(yamlContent, {
      headers: {
        'Content-Type': 'text/yaml',
        'Content-Disposition': `attachment; filename=${cleanFilename}-subscription.yaml`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: '访问订阅失败' },
      { status: 500 }
    )
  }
}
