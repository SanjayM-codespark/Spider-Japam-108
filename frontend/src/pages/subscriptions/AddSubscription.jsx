import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/index.js'
import SubscriptionForm from './SubscriptionForm.jsx'

function AddSubscription() {
    const navigate = useNavigate()

    return (
        <Card title="Add Subscription" subtitle="Create a new subscription package with country pricing">
            <SubscriptionForm
                submitLabel="Add subscription"
                onSaved={() => navigate('/admin/manage-subscription')}
            />
        </Card>
    )
}

export default AddSubscription