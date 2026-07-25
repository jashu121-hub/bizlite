'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { deleteExpenseAction } from '@/actions/expenses'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { ResponsiveDataTable } from '@/components/shared/responsive-data-table'
import { SearchInput } from '@/components/shared/search-input'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { Button } from '@/components/ui/button'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { formatDate } from '@/lib/dates'
import { expenseCategoryLabel, paymentMethodLabel } from '@/lib/labels'
import type { Expense } from '@prisma/client'

export function ExpenseList({ expenses, total, page, currency }: { expenses: Expense[]; total: number; page: number; currency: string }) {
  const router = useRouter(); const search = useSearchParams()
  const update = (changes: Record<string, string>) => { const p = new URLSearchParams(search); Object.entries(changes).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k)); p.set('page', '1'); router.push(`/expenses?${p}`) }
  const remove = async (id: string) => { const result = await deleteExpenseAction(id); if (result.success) { toast.success(result.message ?? 'Expense deleted'); router.refresh() } else toast.error(result.error) }
  const actions = (row: Expense) => <div className="flex justify-end gap-1"><Button asChild variant="ghost" size="icon"><Link href={`/expenses/${row.id}/edit`}><Pencil className="h-4 w-4" /><span className="sr-only">Edit</span></Link></Button><ConfirmDialog title="Delete expense?" description="This cannot be undone." confirmLabel="Delete" variant="destructive" onConfirm={() => remove(row.id)} trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span></Button>} /></div>
  return <div className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row"><SearchInput defaultValue={search.get('q') ?? ''} onChange={(q) => update({ q })} placeholder="Search expenses" /><select className="h-10 rounded-md border bg-transparent px-3" value={search.get('category') ?? 'all'} onChange={(e) => update({ category: e.target.value === 'all' ? '' : e.target.value })}><option value="all">All categories</option>{['MATERIALS','TRANSPORT','RENT','UTILITIES','PACKAGING','MARKETING','SALARY','MAINTENANCE','OTHER'].map((v) => <option key={v} value={v}>{expenseCategoryLabel(v as never)}</option>)}</select></div><ResponsiveDataTable columns={[{key:'date',header:'Date',cell:(r)=>formatDate(r.date)},{key:'description',header:'Description',cell:(r)=>r.description},{key:'category',header:'Category',cell:(r)=>expenseCategoryLabel(r.category)},{key:'amount',header:'Amount',cell:(r)=><CurrencyDisplay value={r.amount} currency={currency} />},{key:'actions',header:'',cell:actions}]} data={expenses} getRowKey={(r)=>r.id} renderMobileCard={(r)=><div className="space-y-2"><div className="flex justify-between"><strong>{r.description}</strong><CurrencyDisplay value={r.amount} currency={currency} /></div><p className="text-sm text-zinc-500">{formatDate(r.date)} · {expenseCategoryLabel(r.category)} · {paymentMethodLabel(r.paymentMethod)}</p>{actions(r)}</div>} emptyTitle="No expenses found" emptyDescription="Record your first business expense to track costs." /><PaginationControls page={page} pageSize={10} total={total} onPageChange={(next)=>{const p=new URLSearchParams(search);p.set('page',String(next));router.push(`/expenses?${p}`)}} /></div>
}
