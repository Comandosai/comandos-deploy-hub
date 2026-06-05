import { describe, expect, it } from 'vitest'
import { getOrderedSupportedAuthTypes } from './provider-wizard'

describe('getOrderedSupportedAuthTypes', () => {
  it('shows only supported auth methods in the stable wizard order', () => {
    expect(getOrderedSupportedAuthTypes(['cli-token'])).toEqual(['cli-token'])
    expect(getOrderedSupportedAuthTypes(['oauth', 'api-key'])).toEqual([
      'api-key',
      'oauth',
    ])
  })
})
