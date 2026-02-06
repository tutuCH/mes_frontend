import { describe, expect, test } from 'vitest'
import { resolveApiBaseUrl } from '@/utils/apiBaseUrl'

describe('resolveApiBaseUrl', () => {
  test('uses env url when not dev override', () => {
    expect(
      resolveApiBaseUrl({
        envUrl: 'https://api.example.com',
        isDev: true,
        locationHostname: '192.168.18.3',
        locationProtocol: 'http:',
      }),
    ).toBe('https://api.example.com')
  })

  test('overrides localhost env url on device in dev', () => {
    expect(
      resolveApiBaseUrl({
        envUrl: 'http://localhost:3000',
        isDev: true,
        locationHostname: '192.168.18.3',
        locationProtocol: 'http:',
      }),
    ).toBe('http://192.168.18.3:3000')
  })

  test('uses device hostname when env url is missing in dev', () => {
    expect(
      resolveApiBaseUrl({
        envUrl: '',
        isDev: true,
        locationHostname: '192.168.18.3',
        locationProtocol: 'http:',
      }),
    ).toBe('http://192.168.18.3:3000')
  })

  test('falls back to localhost when no context', () => {
    expect(
      resolveApiBaseUrl({
        envUrl: '',
        isDev: false,
      }),
    ).toBe('http://localhost:3000')
  })
})
