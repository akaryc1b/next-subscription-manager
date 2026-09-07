'use client'

import { useEffect, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Action, BrandMark, OrbitalArtwork } from './ui'

export function usePasskeySupport() {
  const [supported, setSupported] = useState<boolean | null>(null)
  useEffect(() => {
    setSupported(window.isSecureContext && typeof window.PublicKeyCredential !== 'undefined')
  }, [])
  return supported
}

export function authMessage(error: { code?: string; status?: number; message?: string }, fallback: string) {
  if (error.status === 429 || /RATE_LIMIT|TOO_MANY/i.test(error.code || '') || /too many|频繁/i.test(error.message || '')) {
    return '尝试过于频繁，请稍后再试。'
  }
  if (/INVALID_EMAIL_OR_PASSWORD|INVALID_PASSWORD/i.test(error.code || '')) return '邮箱或密码不正确，请检查后重试。'
  return fallback
}

export function PasswordField({ id, label, hint, className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { id: string; label: string; hint?: string }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="o-field">
      <label htmlFor={id}>{label}</label>
      <div className="p-password">
        <input {...props} id={id} type={visible ? 'text' : 'password'} className={`o-input ${className || ''}`} aria-describedby={hint ? `${id}-hint` : undefined}/>
        <button type="button" aria-label={`${visible ? '隐藏' : '显示'}${label}`} aria-pressed={visible} onClick={() => setVisible(value => !value)} disabled={props.disabled}>
          {visible ? <EyeOff size={17}/> : <Eye size={17}/>}
        </button>
      </div>
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  )
}

export function AuthFrame({ children }: { children: ReactNode }) {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className="orbit-root p-auth">
      <header className="p-auth-top">
        <Link className="o-brand" href="/login" aria-label="sub. 管理员登录"><span><BrandMark/></span><strong>sub<span>.</span></strong></Link>
        <Action variant="quiet" onClick={toggleTheme} aria-label={theme === 'dark' ? '切换浅色主题' : '切换深色主题'}>{theme === 'dark' ? <Sun/> : <Moon/>}</Action>
      </header>
      <main className="p-auth-main">
        <section className="p-auth-story" aria-label="订阅工作空间">
          <p className="o-eyebrow">A LITTLE LESS FRICTION</p>
          <h2>连接有序。<br/><span>管理，从容。</span></h2>
          <p>把配置交给对的人，<br/>把注意力留给重要的事。</p>
          <OrbitalArtwork/>
          <div className="p-auth-signature"><span>SUB / ORBIT</span><span>你的订阅工作空间</span></div>
        </section>
        <section className="p-auth-form">{children}</section>
      </main>
      <footer className="p-auth-footer"><span>sub. / 订阅工作空间</span><span>账户由管理员邀请，订阅按授权分发。</span></footer>
    </div>
  )
}
