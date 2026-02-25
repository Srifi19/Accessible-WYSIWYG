import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Link } from '@tiptap/extension-link'

export class EditorCore {
  constructor({ mount, initialContent = '', onTransaction } = {}) {
    if (!mount) {
      throw new Error('EditorCore: `mount` element is required')
    }

    this._onTransaction = onTransaction

    // Stable ID for aria-controls
    this._editorId = 'wysiwyg-editor-' + Math.random().toString(36).slice(2, 7)
    mount.id = this._editorId

    this._editor = new Editor({
      element: mount,

      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),

        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
          },
        }),
      ],

      content: initialContent || '<p></p>',

      editorProps: {
        attributes: {
          role: 'textbox',
          'aria-multiline': 'true',
          'aria-label': 'Text editor',
          'aria-describedby': 'wysiwyg-editor-hint',
        },

        handleClick(view, pos, event) {
          // Ctrl/Cmd + click opens link
          if (event.ctrlKey || event.metaKey) {
            const $pos = view.state.doc.resolve(pos)
            const linkMark = $pos.marks().find(m => m.type.name === 'link')

            if (linkMark?.attrs.href) {
              window.open(linkMark.attrs.href, '_blank', 'noopener,noreferrer')
              return true
            }
          }
          return false
        },
      },

      onTransaction: () => {
        this._onTransaction?.()
      },
    })

    this._injectHint(mount)
  }

  _injectHint(mount) {
    if (document.getElementById('wysiwyg-editor-hint')) return

    const hint = document.createElement('span')
    hint.id = 'wysiwyg-editor-hint'
    hint.className = 'wysiwyg-visually-hidden'
    hint.textContent =
      'Rich text editor. Use the toolbar above to format text.'

    mount.parentElement?.insertBefore(hint, mount)
  }

  get editorId() { return this._editorId }
  get editor()   { return this._editor }
  get view()     { return this._editor.view }
  get state()    { return this._editor.state }

  getHTML()        { return this._editor.getHTML() }
  getJSON()        { return this._editor.getJSON() }
  setContent(html) { this._editor.commands.setContent(html, true) }
  focus()          { this._editor.commands.focus() }
  destroy()        { this._editor?.destroy() }
}