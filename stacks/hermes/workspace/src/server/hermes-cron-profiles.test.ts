import { describe, expect, it } from 'vitest'
import { buildProfileCronEditArgs } from './hermes-cron-profiles'

describe('buildProfileCronEditArgs', () => {
  it('replaces cron job skills when skills are provided', () => {
    expect(
      buildProfileCronEditArgs('default', 'abc123', {
        name: 'Daily QA',
        skills: ['qa', ' updated ', ''],
      }),
    ).toEqual([
      '--profile',
      'default',
      'cron',
      'edit',
      'abc123',
      '--name',
      'Daily QA',
      '--skill',
      'qa',
      '--skill',
      'updated',
    ])
  })

  it('clears cron job skills when the edit form sends an empty skills list', () => {
    expect(
      buildProfileCronEditArgs('default', 'abc123', { skills: [] }),
    ).toEqual([
      '--profile',
      'default',
      'cron',
      'edit',
      'abc123',
      '--clear-skills',
    ])
  })
})
