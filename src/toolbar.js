// toolbar.js
import { commands } from './commands.js';

// ── Debug toggle ──────────────────────────────────────────────────────────────
const DEBUG = typeof window !== 'undefined' && !!window.WYSIWYG_DEBUG;
const tlog  = (...args) => { if (DEBUG) console.debug('[Toolbar]', ...args); };

// ── SVG icons ─────────────────────────────────────────────────────────────────
const ICONS = {
  h2: `<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 8a2 2 0 0 1-2 2h-2v2h4v2H9v-4a2 2 0 0 1 2-2h2V9H9V7h4a2 2 0 0 1 2 2v2z"/>
  </svg>`,
  h3: `<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M19.01 3h-14c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 7.5c0 .83-.67 1.5-1.5 1.5.83 0 1.5.67 1.5 1.5V15a2 2 0 0 1-2 2h-4v-2h4v-2h-2v-2h2V9h-4V7h4a2 2 0 0 1 2 2v1.5z"/>
  </svg>`,
  bold: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
  </svg>`,
  italic: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
    <line x1="19" y1="4" x2="10" y2="4"/>
    <line x1="14" y1="20" x2="5" y2="20"/>
    <line x1="15" y1="4" x2="9" y2="20"/>
  </svg>`,
  bullet: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
    <line x1="9" y1="6" x2="20" y2="6"/>
    <line x1="9" y1="12" x2="20" y2="12"/>
    <line x1="9" y1="18" x2="20" y2="18"/>
    <circle cx="4" cy="6" r="1" fill="currentColor"/>
    <circle cx="4" cy="12" r="1" fill="currentColor"/>
    <circle cx="4" cy="18" r="1" fill="currentColor"/>
  </svg>`,
  ordered: `<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
    <path d="M3 20v-1h2v-.5H4v-1h1V17H3v-1h3v4Zm5-1v-2h13v2Zm-5-5v-.9L4.8 11H3v-1h3v.9L4.2 13H6v1Zm5-1v-2h13v2ZM4 8V5H3V4h2v4Zm4-1V5h13v2Z"/>
  </svg>`,
  indent: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
    <polyline points="9 9 12 12 9 15"/>
  </svg>`,
  outdent: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
    <polyline points="12 9 9 12 12 15"/>
  </svg>`,
  link: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>`,
  unlink: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" focusable="false">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    <line x1="5" y1="5" x2="19" y2="19"/>
  </svg>`,
};

// ── Button definitions ────────────────────────────────────────────────────────
const BUTTON_DEFS = [
  { command: 'h2',      label: 'Heading 2' },
  { command: 'h3',      label: 'Heading 3' },
  { command: 'bold',    label: 'Bold' },
  { command: 'italic',  label: 'Italic' },
  { command: 'bullet',  label: 'Unordered list' },
  { command: 'ordered', label: 'Ordered list' },
  { command: 'outdent', label: 'Outdent' },
  { command: 'indent',  label: 'Indent' },
  { command: 'link',    label: 'Link' },
  { command: 'unlink',  label: 'Remove link', hidden: true },
];

// Maps each command to the Tiptap isActive() check
const ACTIVE_CHECKERS = {
  bold:    (editor) => editor.isActive('bold'),
  italic:  (editor) => editor.isActive('italic'),
  h2:      (editor) => editor.isActive('heading', { level: 2 }),
  h3:      (editor) => editor.isActive('heading', { level: 3 }),
  bullet:  (editor) => editor.isActive('bulletList'),
  ordered: (editor) => editor.isActive('orderedList'),
  indent:  () => false,
  outdent: () => false,
  link:    (editor) => editor.isActive('link'),
  unlink:  ()       => false,
};

// ─────────────────────────────────────────────────────────────────────────────

export class Toolbar {
  /**
   * @param {object}      options
   * @param {HTMLElement} options.container      - Where to inject the toolbar
   * @param {Function}    options.getEditor      - Returns the Tiptap Editor instance
   * @param {Function}    options.onLinkRequest  - Called when link button clicked
   * @param {string}      [options.editorId]     - ARIA controls id
   */
  constructor({ container, getEditor, onLinkRequest, editorId }) {
    if (!container) throw new Error('Toolbar: `container` is required');

    this._getEditor = getEditor;
    this._editorId  = editorId ?? null;
    this._onLink    = onLinkRequest;
    this._buttons   = [];
    this._index     = 0;
    this._el        = null;
    this._unsubs    = [];
    this._editorBound = false;
    this._raf = null;

    this._build(container);
    this._bindKeyboard();
    this._tryBindEditorEvents();
    this._updateTabindex();
  }

  // ── Build DOM ───────────────────────────────────────────────────────────────

  _build(container) {
    this._el = document.createElement('div');
    this._el.className = 'wysiwyg-toolbar';
    this._el.setAttribute('role', 'toolbar');
    this._el.setAttribute('aria-label', 'Text formatting toolbar');
    if (this._editorId) this._el.setAttribute('aria-controls', this._editorId);

    BUTTON_DEFS.forEach(({ command, label, hidden }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wysiwyg-toolbar-btn';
      btn.dataset.command = command;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('tabindex', '-1');
      btn.innerHTML = ICONS[command] ?? '';

      if (hidden) btn.classList.add('wysiwyg-hidden');

      // Start Indent/Outdent disabled by default (visible).
      if (command === 'indent' || command === 'outdent') {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
      }

      // Prevent mousedown from stealing editor selection — button still gets focus naturally on click
      btn.addEventListener('mousedown', (e) => e.preventDefault());

      btn.addEventListener('click', () => this._execute(command, btn));

      btn.addEventListener('focus', () => {
        this._index = this._buttons.indexOf(btn);
        this._updateTabindex();
        this.syncActiveStates();
      });

      this._el.appendChild(btn);
      this._buttons.push(btn);
    });

    container.prepend(this._el);
  }

  // ── Editor event binding ────────────────────────────────────────────────────

  _tryBindEditorEvents() {
    const editor = this._getEditor?.();
    if (!editor || this._editorBound) return;

    const onChange = () => this._scheduleSync();
    editor.on('selectionUpdate', onChange);
    editor.on('transaction', onChange);
    editor.on('update', onChange);

    this._unsubs.push(() => editor.off('selectionUpdate', onChange));
    this._unsubs.push(() => editor.off('transaction', onChange));
    this._unsubs.push(() => editor.off('update', onChange));

    this._editorBound = true;
    tlog('Editor events bound');
  }

  _scheduleSync() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = null;
      this.syncActiveStates();
    });
  }

  // ── Keyboard navigation (ARIA toolbar roving tabindex) ───────────────────

  _bindKeyboard() {
    this._el.addEventListener('keydown', (e) => {
      const visible = this._visibleButtons();
      if (!visible.length) return;
      let handled = true;

      switch (e.key) {
        case 'ArrowRight':
          this._index = (this._visibleIndex() + 1) % visible.length;
          visible[this._index].focus();
          break;
        case 'ArrowLeft':
          this._index = (this._visibleIndex() - 1 + visible.length) % visible.length;
          visible[this._index].focus();
          break;
        case 'Home':
          this._index = 0;
          visible[0].focus();
          break;
        case 'End':
          this._index = visible.length - 1;
          visible[this._index].focus();
          break;
        default:
          handled = false;
      }

      if (handled) e.preventDefault();
    });
  }

  _visibleButtons() {
    return this._buttons.filter(
      (b) => !b.classList.contains('wysiwyg-hidden') && !b.disabled
    );
  }

  _visibleIndex() {
    const visible = this._visibleButtons();
    const idx     = visible.indexOf(document.activeElement);
    return idx === -1 ? 0 : idx;
  }

  _updateTabindex() {
    const visible = this._visibleButtons();
    if (!visible.length) return;
    this._index = Math.max(0, Math.min(this._index, visible.length - 1));
    this._buttons.forEach((btn) => btn.setAttribute('tabindex', '-1'));
    visible[this._index].setAttribute('tabindex', '0');
  }

  // ── Execute ──────────────────────────────────────────────────────────────────

  _execute(command, btn) {
    if (btn.disabled) return;

    if (command === 'link') {
      this._onLink?.(btn);
      return;
    }

    const editor  = this._getEditor();
    if (!editor) return;

    const factory = commands[command];
    if (factory) {
      tlog('Execute command:', command);
      factory()(editor);
    }

    // Ensure events are bound if editor became available later
    this._tryBindEditorEvents();

    // Update states (buttons may enable/disable/hide here)
    this.syncActiveStates();

    // If this button disabled itself due to action, move focus
    if (btn.disabled || btn.classList.contains('wysiwyg-hidden')) {
      queueMicrotask(() => this._focusNextUsable(btn));
    }
  }

  // ── Sync active / pressed states ─────────────────────────────────────────────

  syncActiveStates() {
    const editor = this._getEditor();
    if (!editor) return;

    // Make sure events are bound once the editor is available
    this._tryBindEditorEvents();

    const linkIsActive = editor.isActive('link');

    const canIndent  = this._canIndent(editor);
    const canOutdent = this._canOutdent(editor);

    if (DEBUG) {
      const { from, to } = editor.state.selection;
      console.groupCollapsed('[Toolbar] syncActiveStates');
      console.debug('selection:', { from, to, empty: editor.state.selection.empty });
      console.debug('isActive:', {
        bulletList: editor.isActive('bulletList'),
        orderedList: editor.isActive('orderedList'),
        link: linkIsActive,
      });
      console.debug('can:', { indent: canIndent, outdent: canOutdent });
      console.groupEnd();
    }

    this._buttons.forEach((btn) => {
      const command = btn.dataset.command;

      // Unlink visibility follows link active state
      if (command === 'unlink') {
        const wasHidden = btn.classList.contains('wysiwyg-hidden');
        btn.classList.toggle('wysiwyg-hidden', !linkIsActive);
        if (!linkIsActive && !wasHidden) this._index = 0;
        this._updateTabindex();
        return;
      }

      // Indent: enable/disable only
      if (command === 'indent') {
        const can = canIndent;
        btn.disabled = !can;
        btn.setAttribute('aria-disabled', String(!can));
        return;
      }

      // Outdent: enable/disable only
      if (command === 'outdent') {
        const can = canOutdent;
        btn.disabled = !can;
        btn.setAttribute('aria-disabled', String(!can));
        return;
      }

      // Active states for other buttons
      const checker  = ACTIVE_CHECKERS[command];
      const isActive = checker ? checker(editor) : false;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    this._updateTabindex();
  }

  // ── Helpers: listItem type & can checks ─────────────────────────────────────

  _getListItemType(editor) {
    const nodes = editor?.schema?.nodes || {};
    if (nodes.listItem) return 'listItem';
    if (nodes.taskItem) return 'taskItem';
    return 'listItem';
  }

  _canIndent(editor) {
    try {
      const li = this._getListItemType(editor);
      return editor.can().chain().focus().sinkListItem(li).run();
    } catch (err) {
      tlog('canIndent error:', err);
      return false;
    }
  }

  _canOutdent(editor) {
    try {
      const li = this._getListItemType(editor);
      return editor.can().chain().focus().liftListItem(li).run();
    } catch (err) {
      tlog('canOutdent error:', err);
      return false;
    }
  }

  // ── Focus management when a button becomes unusable ─────────────────────────

  _focusNextUsable(fromBtn) {
    const isUsable = (b) => !b.classList.contains('wysiwyg-hidden') && !b.disabled;

    const idxAll = this._buttons.indexOf(fromBtn);
    let next = null;

    for (let i = idxAll + 1; i < this._buttons.length; i++) {
      if (isUsable(this._buttons[i])) { next = this._buttons[i]; break; }
    }
    if (!next) {
      for (let i = idxAll - 1; i >= 0; i--) {
        if (isUsable(this._buttons[i])) { next = this._buttons[i]; break; }
      }
    }

    if (next) {
      tlog('Focus moved to button:', next.dataset.command);
      next.focus();
      this._index = this._visibleButtons().indexOf(next);
      this._updateTabindex();
    } else {
      const editor = this._getEditor?.();
      tlog('No usable buttons left, focusing editor');
      editor?.commands?.focus?.();
    }
  }

  // ── Public ───────────────────────────────────────────────────────────────────

  get el() { return this._el; }

  destroy() {
    if (this._unsubs?.length) {
      this._unsubs.forEach((off) => {
        try { off(); } catch {}
      });
    }
    this._unsubs = [];
    this._editorBound = false;

    this._el?.remove();
    this._el     = null;
    this._buttons = [];
  }
}