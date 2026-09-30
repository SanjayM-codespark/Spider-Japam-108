export const CONTENT_STATUSES = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published' },
]

export const DEFAULT_CONTENT_STATUS = 'draft'

// Beads in one round of japa. Mirrors BEAD_COUNTS in
// backend/src/controllers/sacredLibrary.controller.js, which rejects anything
// outside this list.
export const BEAD_COUNTS = [
    { value: '108', label: '108' },
    { value: '1008', label: '1008' },
    { value: '10008', label: '10008' },
]

export const DEFAULT_BEAD_COUNT = '108'
