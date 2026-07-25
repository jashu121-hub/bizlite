'use client'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { productSchema, type ProductInput } from '@/lib/validations/product'
import { PRODUCT_CATEGORIES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CurrencyInput } from '@/components/shared/currency-input'

export function ProductForm({ currency, initial, onSubmit }: { currency: string; initial?: Partial<ProductInput>; onSubmit: (data: ProductInput) => Promise<any> }) {
 const router=useRouter();const [pending,startTransition]=useTransition();const form=useForm<any>({resolver:zodResolver(productSchema),defaultValues:{name:'',category:'General',sku:'',costPrice:'0',sellingPrice:'0',openingStock:0,lowStockLevel:5,notes:'',isActive:true,...initial}})
 const submit=(data:ProductInput)=>startTransition(async()=>{const r=await onSubmit(data);if(!r.success){toast.error(r.error);return}toast.success(r.message??'Product saved');router.push('/products');router.refresh()})
 const field=(label:string,name:keyof ProductInput,type='text')=><div className="space-y-2"><Label>{label}</Label><Input type={type} {...form.register(name as never,{valueAsNumber:type==='number'})}/><p className="text-sm text-red-600">{String(form.formState.errors[name]?.message ?? '')}</p></div>
 return <form onSubmit={form.handleSubmit(submit)} className="mx-auto max-w-2xl space-y-5"><div className="grid gap-5 sm:grid-cols-2">{field('Product name','name')}<div className="space-y-2"><Label>Category</Label><select className="h-10 w-full rounded-md border bg-transparent px-3" {...form.register('category')}>{PRODUCT_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div></div><div className="grid gap-5 sm:grid-cols-2">{field('SKU','sku')}<div className="space-y-2"><Label>Active</Label><label className="flex h-10 items-center gap-2"><input type="checkbox" {...form.register('isActive')}/> Available for sale</label></div></div><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label>Cost price</Label><CurrencyInput currency={currency} value={form.watch('costPrice')} onChange={v=>form.setValue('costPrice',v,{shouldValidate:true})}/></div><div className="space-y-2"><Label>Selling price</Label><CurrencyInput currency={currency} value={form.watch('sellingPrice')} onChange={v=>form.setValue('sellingPrice',v,{shouldValidate:true})}/></div></div><div className="grid gap-5 sm:grid-cols-2">{field('Opening stock','openingStock','number')}{field('Low stock alert level','lowStockLevel','number')}</div><div className="space-y-2"><Label>Notes</Label><Textarea {...form.register('notes')}/></div><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={()=>router.back()}>Cancel</Button><Button disabled={pending}>{pending?'Saving…':'Save product'}</Button></div></form>
}
