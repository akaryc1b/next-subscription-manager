/** Reserve the clipboard write inside the user gesture, including WebKit. */
export async function copyText(load: () => Promise<string>): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) {
    throw new Error('此环境无法复制，请使用 HTTPS 并允许剪贴板访问。')
  }
  if (typeof ClipboardItem !== 'undefined' && typeof navigator.clipboard.write === 'function') {
    const text = load().then(value => new Blob([value], { type: 'text/plain' }))
    // Some browsers reject permission before consuming the promised item.
    void text.catch(() => {})
    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text })])
  } else {
    const text = await load()
    await navigator.clipboard.writeText(text)
  }
}
