import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

function RichTextEditor({ value = '', onChange, placeholder = 'Write help content...' }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder }),
        ],
        content: value,
        onUpdate: ({ editor: instance }) => onChange?.(instance.getHTML()),
        editorProps: {
            attributes: { class: 'rte-editor' },
        },
    })

    useEffect(() => {
        if (!editor) return
        if (editor.getHTML() !== value) {
            editor.commands.setContent(value || '', false)
        }
    }, [editor, value])

    if (!editor) return null

    const items = [
        { id: 'bold', label: 'B', active: () => editor.isActive('bold'), action: () => editor.chain().focus().toggleBold().run(), title: 'Bold' },
        { id: 'italic', label: 'I', active: () => editor.isActive('italic'), action: () => editor.chain().focus().toggleItalic().run(), title: 'Italic' },
        { id: 'strike', label: 'S', active: () => editor.isActive('strike'), action: () => editor.chain().focus().toggleStrike().run(), title: 'Strikethrough' },
        { id: 'h1', label: 'H1', active: () => editor.isActive('heading', { level: 1 }), action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), title: 'Heading 1' },
        { id: 'h2', label: 'H2', active: () => editor.isActive('heading', { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), title: 'Heading 2' },
        { id: 'h3', label: 'H3', active: () => editor.isActive('heading', { level: 3 }), action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), title: 'Heading 3' },
        { id: 'bulletList', label: '\u2022 List', active: () => editor.isActive('bulletList'), action: () => editor.chain().focus().toggleBulletList().run(), title: 'Bullet list' },
        { id: 'orderedList', label: '1. List', active: () => editor.isActive('orderedList'), action: () => editor.chain().focus().toggleOrderedList().run(), title: 'Numbered list' },
        { id: 'blockquote', label: 'Quote', active: () => editor.isActive('blockquote'), action: () => editor.chain().focus().toggleBlockquote().run(), title: 'Quote' },
        { id: 'codeBlock', label: '</>', active: () => editor.isActive('codeBlock'), action: () => editor.chain().focus().toggleCodeBlock().run(), title: 'Code block' },
        { id: 'undo', label: '\u21BA', active: () => false, action: () => editor.chain().focus().undo().run(), title: 'Undo' },
        { id: 'redo', label: '\u21BB', active: () => false, action: () => editor.chain().focus().redo().run(), title: 'Redo' },
    ]

    return (
        <div className="rte">
            <div className="rte-toolbar" role="toolbar" aria-label="Text formatting">
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        title={item.title}
                        className={`rte-btn${item.active() ? ' rte-btn--active' : ''}`}
                        onMouseDown={(event) => {
                            event.preventDefault()
                            item.action()
                        }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>
            <EditorContent editor={editor} />
        </div>
    )
}

export default RichTextEditor