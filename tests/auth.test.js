import { describe, expect, it } from 'vitest'
import { createStore } from '../server/db.js'
import { hashPassword, verifyPassword } from '../server/auth.js'

describe('密码哈希', () => {
  it('哈希可验证，错误密码不通过', () => {
    const h = hashPassword('1234')
    expect(h).not.toContain('1234')
    expect(verifyPassword('1234', h)).toBe(true)
    expect(verifyPassword('1235', h)).toBe(false)
    expect(verifyPassword('', h)).toBe(false)
  })

  it('两次哈希结果不同（随机盐）', () => {
    expect(hashPassword('1234')).not.toBe(hashPassword('1234'))
  })
})

describe('元数据与改名/头像', () => {
  it('meta 读写与覆盖', () => {
    const store = createStore(':memory:')
    expect(store.getMeta('passwordHash')).toBeNull()
    store.setMeta('passwordHash', 'a:1')
    expect(store.getMeta('passwordHash')).toBe('a:1')
    store.setMeta('passwordHash', 'b:2')
    expect(store.getMeta('passwordHash')).toBe('b:2')
  })

  it('updateChild 只更新传入字段，null 保持不变', () => {
    const store = createStore(':memory:')
    const id = store.addChild('小明')
    store.updateChild(id, { avatar: '🐼' })
    let c = store.listChildren()[0]
    expect(c.name).toBe('小明')
    expect(c.avatar).toBe('🐼')

    store.updateChild(id, { name: '明明' })
    c = store.listChildren()[0]
    expect(c.name).toBe('明明')
    expect(c.avatar).toBe('🐼')

    store.updateChild(id, { avatar: '' })
    expect(store.listChildren()[0].avatar).toBe('')
  })
})
