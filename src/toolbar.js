import { commands, markActive, blockActive } from './commands.js';
import { schema } from './schema.js';

// ---------------------------------------------------------------------------
// SVG icon definitions
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Button definitions — order determines DOM order
// ---------------------------------------------------------------------------

const BUTTON_DEFS = [
  { command: 'h2',      label: 'Heading 2' },
  { command: 'h3',      label: 'Heading 3' },
  { command: 'bold',    label: 'Bold' },
  { command: 'italic',  label: 'Italic' },
  { command: 'bullet',  label: 'Unordered list' },
  { command: 'ordered', label: 'Ordered list' },
  { command: 'link',    label: 'Link' },
  { command: 'unlink',  label: 'Remove link', id: 'unlink-button', hidden: true },
];

// Which commands map to which active-state checker
const ACTIVE_CHECKERS = {
  bold:    (state) => markActive(state, schema.marks.strong),
  italic:  (state) => markActive(state, schema.marks.em),
  h2:      (state) => blockActive(state, schema.nodes.heading, { level: 2 }),
  h3:      (state) => blockActive(state, schema.nodes.heading, { level: 3 }),
  bullet:  (state) => isInList(state, schema.nodes.bullet_list),
  ordered: (state) => isInList(state, schema.nodes.ordered_list),
  link:    (state) => markActive(state, schema.marks.link),
  unlink:  ()      => false,
};

function isInList(state, listType) {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === listType) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------

export class Toolbar {
  /**
   * @param {object}   options
   * @param {HTMLElement} options.container   - Where to inject the toolbar element
   * @param {Function} options.getView        - Returns the current EditorView
   * @param {Function} options.onLinkRequest  - Called when the link button is clicked
   */
  constructor({ container, getView, onLinkRequest }) {
    if (!container) throw new Error('Toolbar: `container` is required');

    this._getView  = getView;
    this._onLink   = onLinkRequest;
    this._buttons  = [];
    this._index    = 0;           // roving tabindex pointer
    this._el       = null;

    this._build(container);
    this._bindKeyboard();
    this._updateTabindex();
  }

  // ---------------------------------------------------------------------------
  // Build DOM
  // ---------------------------------------------------------------------------

  _build(container) {
    const editorId = container.closest('[id]')?.id ?? 'editor';

    this._el = document.createElement('div');
    this._el.className = 'wysiwyg-toolbar';
    this._el.setAttribute('role', 'toolbar');
    this._el.setAttribute('aria-label', 'Text formatting toolbar');
    this._el.setAttribute('aria-controls', editorId);

    BUTTON_DEFS.forEach(({ command, label, id, hidden }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'wysiwyg-toolbar-btn';
      btn.dataset.command = command;
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('tabindex', '-1');
      btn.innerHTML = ICONS[command] ?? '';

      if (id) btn.id = id;
      if (hidden) btn.classList.add('wysiwyg-hidden');

      // mousedown: keep editor focus, don't let button steal it
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._getView()?.dom.focus();
      });

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

  // ---------------------------------------------------------------------------
  // Keyboard navigation (roving tabindex — ARIA toolbar pattern)
  // ---------------------------------------------------------------------------

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
    return this._buttons.filter((b) => !b.classList.contains('wysiwyg-hidden') && this._isVisible(b));
  }

  _visibleIndex() {
    const visible = this._visibleButtons();
    const focused = document.activeElement;
    const idx = visible.indexOf(focused);
    return idx === -1 ? 0 : idx;
  }

  _isVisible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  _updateTabindex() {
    const visible = this._visibleButtons();
    if (!visible.length) return;

    // Clamp in case hidden buttons shifted things
    this._index = Math.max(0, Math.min(this._index, visible.length - 1));

    this._buttons.forEach((btn) => btn.setAttribute('tabindex', '-1'));
    visible[this._index].setAttribute('tabindex', '0');
  }

  // ---------------------------------------------------------------------------
  // Command execution
  // ---------------------------------------------------------------------------

  _execute(command, btn) {
    if (command === 'link') {
      this._onLink?.(btn);
      return;
    }

    const view = this._getView();
    if (!view) return;

    const factory = commands[command];
    if (factory) {
      factory()(view.state, view.dispatch, view);
      view.focus();
    }

    this.syncActiveStates();
  }

  // ---------------------------------------------------------------------------
  // Sync active / pressed states
  // ---------------------------------------------------------------------------

  syncActiveStates() {
    const view = this._getView();
    if (!view) return;

    const { state } = view;
    const linkActive = markActive(state, schema.marks.link);

    this._buttons.forEach((btn) => {
      const command = btn.dataset.command;

      // Unlink button: show only when cursor is inside a link
      if (command === 'unlink') {
        const isNowHidden = !linkActive;
        const wasHidden = btn.classList.contains('wysiwyg-hidden');

        btn.classList.toggle('wysiwyg-hidden', isNowHidden);

        if (isNowHidden && !wasHidden) {
          // Focus jumped away — reset tabindex to first visible button
          this._index = 0;
        }

        this._updateTabindex();
        return;
      }

      const checker = ACTIVE_CHECKERS[command];
      const isActive = checker ? checker(state) : false;

      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    this._updateTabindex();
  }

  // ---------------------------------------------------------------------------
  // Public
  // ---------------------------------------------------------------------------

  /** The toolbar DOM element */
  get el() {
    return this._el;
  }

  destroy() {
    this._el?.remove();
    this._el = null;
    this._buttons = [];
  }
}