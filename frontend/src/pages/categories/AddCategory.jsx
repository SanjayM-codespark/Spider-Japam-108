import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/index.js'
import CategoryForm from './CategoryForm.jsx'

function AddCategory() {
    const navigate = useNavigate()

    return (
        <Card title="Add Category" subtitle="Group Sacred Library content under a named category">
            <CategoryForm
                submitLabel="Save"
                onSaved={() => navigate('/admin/manage-category')}
                onCancel={() => navigate('/admin/manage-category')}
            />
        </Card>
    )
}

export default AddCategory
