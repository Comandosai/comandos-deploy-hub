import { describe, expect, it } from 'vitest'
import {
  buildCronTickArgs,
  buildProfileCronActionArgs,
  buildProfileCronEditArgs,
} from './hermes-cron-profiles'

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

describe('buildProfileCronActionArgs', () => {
  it('auto-accepts hooks for manual cron run', () => {
    expect(buildProfileCronActionArgs('default', 'abc123', 'run')).toEqual([
      '--profile',
      'default',
      'cron',
      'run',
      '--accept-hooks',
      'abc123',
    ])
  })

  it('keeps non-run cron actions unchanged', () => {
    expect(buildProfileCronActionArgs('default', 'abc123', 'pause')).toEqual([
      '--profile',
      'default',
      'cron',
      'pause',
      'abc123',
    ])
  })
})

describe('buildCronTickArgs', () => {
  it('auto-accepts hooks when kicking the default scheduler', () => {
    expect(buildCronTickArgs()).toEqual(['cron', 'tick', '--accept-hooks'])
  })

  it('auto-accepts hooks when kicking a profile scheduler', () => {
    expect(buildCronTickArgs('writer')).toEqual([
      '--profile',
      'writer',
      'cron',
      'tick',
      '--accept-hooks',
    ])
  })
})
