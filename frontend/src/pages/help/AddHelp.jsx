import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/index.js'
import HelpForm from './HelpForm.jsx'

function AddHelp() {
    const navigate = useNavigate()

    return (
        <Card title="Add Helps" subtitle="Create a new help article with an HTML rich text editor">
            <HelpForm
                submitLabel="Add help"
                onSaved={() => navigate('/admin/manage-help')}
            />
        </Card>
    )
}

export default AddHelp