'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type CostTypeApplyScope = 'new' | 'existing'

export function ApplyCostTypeDialog({
  open,
  onOpenChange,
  onConfirm,
  pending,
  count = 1,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (scope: CostTypeApplyScope) => void | Promise<void>
  pending?: boolean
  count?: number
}) {
  const [scope, setScope] = useState<CostTypeApplyScope>('new')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply cost type change?</DialogTitle>
          <DialogDescription>
            You changed the default Cost Type for {count} categor{count === 1 ? 'y' : 'ies'}.
            Choose how it should apply.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="flex items-start gap-2">
            <input
              type="radio"
              className="mt-1"
              checked={scope === 'new'}
              onChange={() => setScope('new')}
            />
            <span>
              <span className="font-medium text-zinc-900">New expenses only</span>
              <span className="block text-zinc-500">Historical expenses stay unchanged.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="radio"
              className="mt-1"
              checked={scope === 'existing'}
              onChange={() => setScope('existing')}
            />
            <span>
              <span className="font-medium text-zinc-900">New and existing expenses</span>
              <span className="block text-zinc-500">
                Update linked expenses to this Cost Type.
              </span>
            </span>
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => void onConfirm(scope)}
          >
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
