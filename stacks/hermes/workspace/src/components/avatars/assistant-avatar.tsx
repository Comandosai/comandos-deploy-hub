import { memo } from 'react'
import { cn } from '@/lib/utils'

type AvatarProps = {
  size?: number
  className?: string
}

function AssistantAvatarComponent({ size = 28, className }: AvatarProps) {
  return (
    <img
      src="/komandos/logo-mark.png"
      alt="COMANDOS AI"
      className={cn('shrink-0', className)}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(4, Math.round(size * 0.15)),
      }}
    />
  )
}

export const AssistantAvatar = memo(AssistantAvatarComponent)
