import { Editor, Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Link } from '@tiptap/extension-link'
import { createMarkdownParser, createMarkdownSerializer } from './markdown.js'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function isVisible(el) {
  if (el.offsetParent === null && el.tagName !== 'BODY') return false
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false
  return true
}

function getVisibleFocusable() {
  return Array.from(document.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible)
}

const NormalizeTabInList = Extension.create({
  name: 'normalizeTabInList',
  priority: 1000,

  addKeyboardShortcuts() {
    const isInsideList = (state) => {
      const { $from } = state.selection
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth)
        if (
          node.type.name === 'listItem' ||
          node.type.name === 'bulletList' ||
          node.type.name === 'orderedList'
        ) {
          return true
        }
      }
      return false
    }

    return {
      Tab: ({ editor }) => {
        if (!isInsideList(editor.state)) return false

        const all = getVisibleFocusable()
        const contentEl = editor.options.element.querySelector('[contenteditable]')
        const currentIndex = all.indexOf(contentEl)
        const target = all[currentIndex + 1] ?? null

        if (target) {
          target.focus()
        } else {
          contentEl.blur()
        }
        return true
      },

      'Shift-Tab': ({ editor }) => {
        if (!isInsideList(editor.state)) return false

        const lastFocused = editor.storage.normalizeTabInList?.lastFocused
        const target = lastFocused && isVisible(lastFocused) && document.contains(lastFocused)
          ? lastFocused
          : (() => {
              const all = getVisibleFocusable()
              const contentEl = editor.options.element.querySelector('[contenteditable]')
              return all[all.indexOf(contentEl) - 1] ?? null
            })()

        target?.focus()
        return true
      },
    }
  },

  addStorage() {
    return { lastFocused: null }
  },

  onBeforeCreate() {
    this._focusListener = (e) => {
      const contentEl = this.editor.options.element?.querySelector('[contenteditable]')
      if (contentEl && !contentEl.contains(e.target) && e.target !== contentEl) {
        this.storage.lastFocused = e.target
      }
    }
    document.addEventListener('focusin', this._focusListener, true)
  },

  onDestroy() {
    document.removeEventListener('focusin', this._focusListener, true)
  },
})

export class EditorCore {
  constructor({ mount, initialContent = '', onTransaction } = {}) {
    if (!mount) {
      throw new Error('EditorCore: `mount` element is required')
    }

    this._onTransaction = onTransaction

    this._editorId = 'wysiwyg-editor-' + Math.random().toString(36).slice(2, 7)
    mount.id = this._editorId

    this._editor = new Editor({
      element: mount,

      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          link: false,
        }),

        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
          },
        }),

        NormalizeTabInList,
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

    // Markdown parser/serializer bound to THIS editor's schema
    const schema = this._editor.schema
    this._markdownParser = createMarkdownParser(schema)
    this._markdownSerializer = createMarkdownSerializer(schema)

    this._injectHint(mount)
  }

  _injectHint(mount) {
    if (document.getElementById('wysiwyg-editor-hint')) return

    const hint = document.createElement('span')
    hint.id = 'wysiwyg-editor-hint'
    hint.className = 'wysiwyg-visually-hidden'
    hint.textContent = 'Rich text editor. Use the toolbar above to format text.'

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

  getMarkdown() {
    return this._markdownSerializer.serialize(this._editor.state.doc)
  }

  setMarkdown(md) {
    const doc = this._markdownParser.parse(md)
    this._editor.commands.setContent(doc.toJSON())
  }
}
