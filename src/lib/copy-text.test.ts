import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './copy-text'

afterEach(() => vi.unstubAllGlobals())
describe('gesture-preserving clipboard writes', () => {
  it('reserves write before the metadata request resolves', async () => {
    let resolve!: (value: string) => void
    const data = new Promise<string>(done => { resolve = done })
    let written = ''
    class Item { constructor(public representations: Record<string, Promise<Blob>>) {} }
    const write = vi.fn(async ([item]: Item[]) => { written = await (await item.representations['text/plain']).text() })
    vi.stubGlobal('ClipboardItem', Item)
    vi.stubGlobal('navigator', { clipboard: { write } })
    const result = copyText(() => data)
    expect(write).toHaveBeenCalledTimes(1)
    expect(written).toBe('')
    resolve('sub://fixture')
    await result
    expect(written).toBe('sub://fixture')
  })
  it('supports the text fallback without ClipboardItem', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('ClipboardItem', undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await copyText(async () => 'fallback')
    expect(writeText).toHaveBeenCalledWith('fallback')
  })
  it('does not fetch a credential when clipboard access is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    const load = vi.fn()
    await expect(copyText(load)).rejects.toThrow('HTTPS')
    expect(load).not.toHaveBeenCalled()
  })
  it('propagates a denied clipboard permission, without a false success', async () => {
    vi.stubGlobal('ClipboardItem', class {})
    vi.stubGlobal('navigator', { clipboard: { write: vi.fn().mockRejectedValue(new Error('denied')) } })
    await expect(copyText(async () => 'private')).rejects.toThrow('denied')
  })
  it('propagates metadata failure, never copying an error as a link', async () => {
    class Item { constructor(public representations: Record<string, Promise<Blob>>) {} }
    vi.stubGlobal('ClipboardItem', Item)
    vi.stubGlobal('navigator', { clipboard: { write: async ([item]: Item[]) => { await item.representations['text/plain'] } } })
    await expect(copyText(async () => { throw new Error('expired session') })).rejects.toThrow('expired session')
  })
})
