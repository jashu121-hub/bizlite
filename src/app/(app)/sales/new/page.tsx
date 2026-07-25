import { createSaleAction } from '@/actions/sales'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { SalesForm } from '../sales-form'
export default async function NewSalePage(){const {user,profile}=await requireProfile();const [products,customers]=await Promise.all([prisma.product.findMany({where:{userId:user.id,isActive:true},select:{id:true,name:true,currentStock:true,sellingPrice:true}}),prisma.customer.findMany({where:{userId:user.id},select:{id:true,name:true},orderBy:{name:'asc'}})]);return <div className="space-y-6"><PageHeader title="New sale" description="Create a sale and update stock."/><SalesForm products={products.map(p=>({...p,sellingPrice:p.sellingPrice.toString()}))} customers={customers} currency={profile.currency} onSubmit={createSaleAction}/></div>}
