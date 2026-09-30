export const CATEGORY_STATUSES = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
]

export const DEFAULT_CATEGORY_STATUS = 'active'

// Mirrors the allowlist and size cap in backend/src/config/uploads.js. The
// server enforces both regardless; checking here just avoids handing the admin
// a request that is certain to be rejected.
export const ACCEPTED_IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
]

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
