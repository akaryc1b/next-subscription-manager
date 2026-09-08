import { NextResponse } from 'next/server'

/** Never inspect, echo, validate or consume legacy bearer tokens. */
export function activationUnavailable() {
  return NextResponse.json({ code: 'ACTIVATION_DISABLED', error: '激活入口已停用，订阅用户无需登录' }, {
    status: 410,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'Referrer-Policy': 'no-referrer' },
  })
}
