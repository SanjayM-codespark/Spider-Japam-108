import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/index.js'
import SubcategoryForm from './SubcategoryForm.jsx'

function AddSubcategory() {
    const navigate = useNavigate()

    return (
        <Card title="Add Subcategory" subtitle="Group Sacred Library content under a subcategory">
            <SubcategoryForm
                submitLabel="Save"
                onSaved={() => navigate('/admin/manage-subcategory')}
                onCancel={() => navigate('/admin/manage-subcategory')}
            />
        </Card>
    )
}

export default AddSubcategory
