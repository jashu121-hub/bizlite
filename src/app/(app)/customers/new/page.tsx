import { createCustomerAction } from '@/actions/customers'
import { PageHeader } from '@/components/shared/page-header'
import { CustomerForm } from '../customer-form'
export default function NewCustomerPage(){return <div className="space-y-6"><PageHeader title="New customer" description="Add a customer for credit sales and payments."/><CustomerForm onSubmit={createCustomerAction}/></div>}
