import { injectStyles } from './styles.js';
import { EditorCore }   from './editorCore.js';
import { Toolbar }      from './toolbar.js';
import { LinkPopup }    from './linkPopup.js';

export class WYSIWYGEditor {
  constructor({
    container,
    initialContent = '',
    onChange,
    plugins = [],
    language = 'en',
  } = {}) {

    if (
      !container ||
      !(container instanceof HTMLElement || container instanceof ShadowRoot)
    ) {
      throw new Error('WYSIWYGEditor: `container` must be an HTMLElement or ShadowRoot');
    }

    // container is either a ShadowRoot or a normal element
    this._root = container;

    // Inject styles into the shadow root (or document head as fallback)
    injectStyles(this._root);

    // Internal wrapper inside the root so CSS can target `.wysiwyg-container`
    const wrapper = document.createElement('div');
    wrapper.className = 'wysiwyg-container';
    this._container = wrapper;
    this._root.appendChild(wrapper);

    this._onChange = onChange ?? null;
    this._language = language;

    // Live region for screen reader announcements
    this._status = this._buildStatus();
    this._container.appendChild(this._status);

    // Editor mount point
    const editorMount = document.createElement('div');
    editorMount.setAttribute('lang', this._language);
    this._editorMount = editorMount;
    this._container.appendChild(editorMount);

    // Core (Tiptap)
    this._core = new EditorCore({
      mount:          editorMount,
      initialContent,
      language:       this._language,
      onTransaction:  () => this._handleTransaction(),
    });

    this._linkPopup = new LinkPopup({
      container: this._container,
      language: this._language,
      getEditor: () => this._core.editor,
      onApply:   () => {},
    });

    // Toolbar
    this._toolbar = new Toolbar({
      container:     this._container,
      language:      this._language,
      getEditor:     () => this._core.editor,
      onLinkRequest: (btn) => this._linkPopup.open(btn),
      editorId:      this._core.editorId,
    });

    // Plugins
    this._plugins = [];
    plugins.forEach((p) => this._registerPlugin(p));
  }

  // ── Internal ──────────────────────────────────────────────

  _handleTransaction() {
    this._toolbar.syncActiveStates();
    this._onChange?.({
      html: this.getHTML(),
      json: this.getJSON(),
      markdown: this.getMarkdown(),
    });
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
    try {
      plugin(this);
      this._plugins.push(plugin);
    } catch (err) {
      console.warn('WYSIWYGEditor: plugin error:', err);
    }
  }

  // ── Public API ────────────────────────────────────────────

  getHTML()     { return this._core.getHTML(); }
  getJSON()     { return this._core.getJSON(); }
  getMarkdown() { return this._core.getMarkdown(); }

  setContent(html) {
    this._core.setContent(html);
    this._toolbar.syncActiveStates();
  }

  setMarkdown(md) {
    this._core.setMarkdown(md);
    this._toolbar.syncActiveStates();
  }

  focus()       { this._core.focus(); }
  announce(msg) { this._announce(msg); }

  setLanguage(lang) {
    this._language = lang;
    if (this._editorMount) {
      this._editorMount.setAttribute('lang', lang);
    }
    this._linkPopup?.setLanguage(lang);
    this._toolbar?.setLanguage?.(lang);
  }

  destroy() {
    this._toolbar?.destroy();
    this._linkPopup?.destroy();
    this._core?.destroy();
    if (this._root instanceof ShadowRoot) {
      this._root.innerHTML = '';
    } else {
      this._root.innerHTML = '';
    }
  }

  // Expose internals for plugin authors
  get editor()    { return this._core?.editor; }
  get view()      { return this._core?.view; }
  get toolbar()   { return this._toolbar; }
  get linkPopup() { return this._linkPopup; }
}
