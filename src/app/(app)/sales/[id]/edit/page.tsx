import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { updateSaleAction } from '@/actions/sales'
import { PageHeader } from '@/components/shared/page-header'
import { SalesForm } from '../../sales-form'
export default async function EditSalePage({params}:{params:Promise<{id:string}>}){const {id}=await params;const {user,profile}=await requireProfile();const [sale,products,customers]=await Promise.all([prisma.sale.findFirst({where:{id,userId:user.id},include:{items:true}}),prisma.product.findMany({where:{userId:user.id,isActive:true},select:{id:true,name:true,currentStock:true,sellingPrice:true}}),prisma.customer.findMany({where:{userId:user.id},select:{id:true,name:true}})]);if(!sale)notFound();return <div className="space-y-6"><PageHeader title={`Edit ${sale.invoiceNumber}`} description="Changes will reconcile stock."/><SalesForm products={products.map(p=>({...p,sellingPrice:p.sellingPrice.toString()}))} customers={customers} currency={profile.currency} initial={{date:format(sale.date,'yyyy-MM-dd'),customerId:sale.customerId??'',items:sale.items.map(i=>({productId:i.productId??'',quantity:i.quantity,unitSellingPrice:i.unitSellingPrice.toString()})),discount:sale.discount.toString(),amountPaid:sale.amountPaid.toString(),paymentMethod:sale.paymentMethod,notes:sale.notes??''}} onSubmit={d=>updateSaleAction(id,d)}/></div>}
