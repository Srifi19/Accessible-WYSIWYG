/**
 * WYSIWYGEditor — self-contained accessible rich-text editor built on Tiptap.
 */

import { injectStyles } from './styles.js';
import { EditorCore }   from './editorCore.js';
import { Toolbar }      from './toolbar.js';
import { LinkPopup }    from './linkPopup.js';

export class WYSIWYGEditor {
  constructor({ container, initialContent = '', onChange, plugins = [] } = {}) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('WYSIWYGEditor: `container` must be an HTMLElement');
    }

    injectStyles();

    this._container = container;
    this._container.classList.add('wysiwyg-container');
    this._onChange = onChange ?? null;

    // Live region for screen reader announcements
    this._status = this._buildStatus();
    this._container.appendChild(this._status);

    // Editor mount point
    const editorMount = document.createElement('div');
    this._container.appendChild(editorMount);

    // Core (Tiptap)
    this._core = new EditorCore({
      mount:          editorMount,
      initialContent,
      onTransaction:  () => this._handleTransaction(),
    });

    // Link popup — must exist before Toolbar
    this._linkPopup = new LinkPopup({
      container: this._container,
      getEditor: () => this._core.editor,
      onApply:   () => this._announce('Link added to document.'),
    });

    // Toolbar
    this._toolbar = new Toolbar({
      container:     this._container,
      getEditor:     () => this._core.editor,
      onLinkRequest: (btn) => this._linkPopup.open(btn),
      editorId:      this._core.editorId,
    });

    // Plugins
    this._plugins = [];
    plugins.forEach((p) => this._registerPlugin(p));
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _handleTransaction() {
    this._toolbar.syncActiveStates();
    this._onChange?.({ html: this.getHTML(), json: this.getJSON(), markdown: this.getMarkdown() });
  }

  _announce(message) {
    if (!this._status) return;
    this._status.textContent = '';
    requestAnimationFrame(() => { this._status.textContent = message; });
  }

  _buildStatus() {
    const el = document.createElement('div');
    el.className = 'wysiwyg-status';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    return el;
  }

  _registerPlugin(plugin) {
    if (typeof plugin !== 'function') {
      console.warn('WYSIWYGEditor: plugin must be a function');
      return;
    }
    try   { plugin(this); this._plugins.push(plugin); }
    catch (err) { console.warn('WYSIWYGEditor: plugin error:', err); }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  getHTML()        { return this._core.getHTML(); }
  getJSON()        { return this._core.getJSON(); }
  setContent(html) { this._core.setContent(html); this._toolbar.syncActiveStates(); }
  focus()          { this._core.focus(); }
  announce(msg)    { this._announce(msg); }

  getMarkdown() {
    return this._core.getMarkdown();
  }

  setMarkdown(md) {
    this._core.setMarkdown(md);
    this._toolbar.syncActiveStates();
  }

  destroy() {
    this._toolbar?.destroy();
    this._linkPopup?.destroy();
    this._core?.destroy();
    this._container.classList.remove('wysiwyg-container');
    this._container.innerHTML = '';
  }

  // Expose internals for plugin authors
  get editor()    { return this._core?.editor; }
  get view()      { return this._core?.view; }
  get toolbar()   { return this._toolbar; }
  get linkPopup() { return this._linkPopup; }
}

// Re-exports for plugin authors
export { commands, markActive, blockActive, inList } from './commands.js';
