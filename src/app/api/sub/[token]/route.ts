import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getClientIp, maskToken, recordSecurityEvent } from '@/lib/security-events'
import yaml from 'js-yaml'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
  'X-Content-Type-Options': 'nosniff',
}

function errorResponse(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: noStoreHeaders }
  )
}

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
              orderBy: {
                createdAt: 'asc',
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
        message: '访问不存在或已轮换失效的订阅 token',
      })

      return errorResponse('订阅不存在或链接已失效', 404)
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

      return errorResponse('用户已禁用', 403)
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

      return errorResponse('用户已被封禁', 403)
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

      return errorResponse('订阅已过期', 403)
    }

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

      return errorResponse('订阅访问次数已达上限，请联系管理员重置', 403)
    }

    const activeConfigs = user.userConfigs
      .map(uc => uc.config)
      .filter(config => config.isActive)

    if (activeConfigs.length === 0) {
      return errorResponse('没有可用的配置', 404)
    }

    // 第一份配置作为基础模板；后续配置只合并列表和 provider 字段。
    // userConfigs 已按创建时间排序，保证每次合并结果一致。
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
          mergedConfig = { ...parsed }

          for (const field of listFields) {
            if (!Array.isArray(mergedConfig[field])) {
              mergedConfig[field] = []
            }
          }

          for (const field of providerFields) {
            if (!mergedConfig[field] || typeof mergedConfig[field] !== 'object' || Array.isArray(mergedConfig[field])) {
              mergedConfig[field] = {}
            }
          }
        } else {
          if (parsed.proxies && Array.isArray(parsed.proxies)) {
            mergedConfig.proxies.push(...parsed.proxies)
          }
          if (parsed['proxy-groups'] && Array.isArray(parsed['proxy-groups'])) {
            mergedConfig['proxy-groups'].push(...parsed['proxy-groups'])
          }
          if (parsed.rules && Array.isArray(parsed.rules)) {
            mergedConfig.rules.push(...parsed.rules)
          }
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
      } catch (error) {
        console.error(`Failed to parse config ${config.name}:`, error)
      }
    }

    if (!mergedConfig) {
      return errorResponse('配置解析失败', 500)
    }

    const ip = getClientIp(request)
    const userAgent = request.headers.get('user-agent')?.slice(0, 512) || undefined

    const accessGranted = await prisma.$transaction(async tx => {
      const updateResult = subscription.maxAccess > 0
        ? await tx.subscription.updateMany({
            where: {
              id: subscription.id,
              token,
              accessCount: {
                lt: subscription.maxAccess,
              },
            },
            data: { accessCount: { increment: 1 } },
          })
        : await tx.subscription.updateMany({
            where: {
              id: subscription.id,
              token,
            },
            data: { accessCount: { increment: 1 } },
          })

      // token 条件保证管理员在请求处理中轮换 Token 时，旧请求不会继续获准。
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
        message: '订阅 Token 已轮换或访问次数在并发请求中达到上限',
        metadata: {
          reason: 'token_rotated_or_access_limit_exceeded_atomic',
          maxAccess: subscription.maxAccess,
          accessCount: subscription.accessCount,
        },
      })

      return errorResponse('订阅链接已失效或访问次数已达上限', 403)
    }

    const yamlContent = yaml.dump(mergedConfig)
    const emailPrefix = user.email.split('@')[0]
    const cleanFilename = emailPrefix.replace(/[^\w\-]/g, '_')

    return new NextResponse(yamlContent, {
      headers: {
        ...noStoreHeaders,
        'Content-Type': 'text/yaml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${cleanFilename}-subscription.yaml"`,
      },
    })
  } catch (error) {
    console.error('访问订阅失败:', error)
    return errorResponse('访问订阅失败', 500)
  }
}
