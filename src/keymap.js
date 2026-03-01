import { Extension } from '@tiptap/core'

/**
 * EditorKeymap
 *
 * Handles Tab / Shift+Tab navigation in and out of the editor,
 * including when the cursor is inside a list.
 *
 * How it works:
 *   handleDOMEvents.keydown fires before ProseMirror's entire plugin
 *   and keymap pipeline — including prosemirror-schema-list's indent/
 *   outdent handlers and StarterKit's ListItem shortcuts. Nothing can
 *   beat it, so we don't need to touch listItem at all.
 *
 * Tab        → blur editor, focus next focusable element in page
 * Shift+Tab  → blur editor, return focus to last active toolbar element
 *              (falls back to first toolbar item, then prev page element)
 *
 * Setup in WYSIWYGEditor after toolbar is built:
 *   this._core.setToolbar(this._toolbar.element)
 */

// ─── Toolbar focus tracker ────────────────────────────────────────────────────

let _lastToolbarEl = null

/**
 * Call once, passing the toolbar root element.
 * Remembers the last focused button/input inside it.
 *
 * @param   {HTMLElement}  toolbarEl
 * @returns {() => void}   cleanup function
 */
export function trackToolbarFocus(toolbarEl) {
  function onFocusIn(e) {
    if (isFocusable(e.target)) _lastToolbarEl = e.target
  }
  toolbarEl.addEventListener('focusin', onFocusIn)
  return () => toolbarEl.removeEventListener('focusin', onFocusIn)
}

function isFocusable(el) {
  return el.matches(
    'button:not([disabled]), [href], input:not([disabled]), ' +
    'select:not([disabled]), textarea:not([disabled]), ' +
    '[tabindex]:not([tabindex="-1"])'
  )
}

// ─── Page focus helpers ───────────────────────────────────────────────────────

function getFocusable() {
  return Array.from(
    document.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), ' +
      'select:not([disabled]), textarea:not([disabled]), ' +
      '[tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    )
  ).filter(el => !el.closest('[hidden]') && isVisible(el))
}

function isVisible(el) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
}

function focusNext(editorEl) {
  const all = getFocusable()
  const idx = all.indexOf(editorEl)
  all[idx + 1]?.focus()
}

function focusToolbarOrPrev(toolbarEl, editorEl) {
  if (_lastToolbarEl && toolbarEl?.contains(_lastToolbarEl)) {
    _lastToolbarEl.focus()
    return
  }
  const first = toolbarEl?.querySelector(
    'button:not([disabled]), [href], input:not([disabled]), ' +
    'select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  if (first) { first.focus(); return }

  // No toolbar — fall back to previous focusable element in page
  const all = getFocusable()
  const idx = all.indexOf(editorEl)
  all[idx - 1]?.focus()
}

// ─── Extension ───────────────────────────────────────────────────────────────

export function buildKeymapExtensions({ getToolbar = () => null } = {}) {
  const KeymapExtension = Extension.create({
    name: 'editorKeymap',

    addProseMirrorPlugins() {
      return [{
        props: {
          // handleDOMEvents fires before handleKeyDown and before ALL
          // keymap plugins — list indent/outdent cannot win against this
          handleDOMEvents: {
            keydown(view, event) {
              if (event.key !== 'Tab') return false

              event.preventDefault()
              event.stopPropagation()

              const editorEl  = view.dom
              const toolbarEl = getToolbar()  // lazy — resolved at event time

              view.dom.blur()

              if (event.shiftKey) {
                focusToolbarOrPrev(toolbarEl, editorEl)
              } else {
                focusNext(editorEl)
              }

              return true
            },
          },
        },
      }]
    },
  })

  return [KeymapExtension]
}