import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/index.js'
import ContentForm from './ContentForm.jsx'

function AddContent() {
    const navigate = useNavigate()

    return (
        <Card
            title="Add Sacred Content"
            subtitle="Create a new Sacred Library entry. Published entries appear in the app's Sacred Library under the category you choose."
        >
            <ContentForm
                variant="add"
                submitLabel="Save"
                onSaved={() => navigate('/admin/manage-content')}
                onCancel={() => navigate('/admin/manage-content')}
            />
        </Card>
    )
}

export default AddContent
