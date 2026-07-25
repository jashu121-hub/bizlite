import Link from 'next/link'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { requireProfile } from '@/lib/auth'
import { PageHeader } from '@/components/shared/page-header'
import { ResponsiveDataTable } from '@/components/shared/responsive-data-table'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { Button } from '@/components/ui/button'
export default async function CustomersPage(){const {user,profile}=await requireProfile();const customers=await prisma.customer.findMany({where:{userId:user.id},include:{sales:{select:{balancePending:true}}},orderBy:{name:'asc'}});return <div className="space-y-6"><PageHeader title="Customers" description="Manage customers and outstanding balances." actions={<Button asChild><Link href="/customers/new"><Plus/> New customer</Link></Button>}/><ResponsiveDataTable data={customers} getRowKey={c=>c.id} columns={[{key:'name',header:'Customer',cell:c=><Link className="font-medium hover:underline" href={`/customers/${c.id}`}>{c.name}</Link>},{key:'phone',header:'Phone',cell:c=>c.phone??'—'},{key:'email',header:'Email',cell:c=>c.email??'—'},{key:'balance',header:'Outstanding',cell:c=><CurrencyDisplay currency={profile.currency} value={c.sales.reduce((a,s)=>a+Number(s.balancePending),0)}/> }]} renderMobileCard={c=><div><Link className="font-medium" href={`/customers/${c.id}`}>{c.name}</Link><p className="text-sm text-zinc-500">{c.phone??c.email??'No contact details'}</p></div>} emptyTitle="No customers yet" emptyDescription="Add customers to track their credit balances."/></div>}
