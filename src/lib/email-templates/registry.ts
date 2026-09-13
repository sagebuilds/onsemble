import type { ComponentType } from 'react'
import { template as roomInviteMember } from './room-invite-member'
import { template as roomInviteNewUser } from './room-invite-new-user'
import { template as shelfItemAdded } from './shelf-item-added'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'room-invite-member': roomInviteMember,
  'room-invite-new-user': roomInviteNewUser,
  'shelf-item-added': shelfItemAdded,
}
