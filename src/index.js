/**
 * WYSIWYGEditor — a self-contained, accessible rich-text editor
 * built on ProseMirror. Drop it into any project with one import.
 *
 * Usage:
 *   import { WYSIWYGEditor } from './WYSIWYGEditor/index.js';
 *
 *   const editor = new WYSIWYGEditor({
 *     container:      document.querySelector('#root'),
 *     onChange:       ({ html, json }) => console.log(html),
 *     initialContent: '<p>Hello world</p>',
 *     plugins:        [myPlugin],
 *   });
 *
 *   editor.getHTML();
 *   editor.getJSON();
 *   editor.setContent('<p>New content</p>');
 *   editor.destroy();
 */

import { injectStyles }  from './styles.js';
import { EditorCore }    from './editorCore.js';
import { Toolbar }       from './toolbar.js';
import { LinkPopup }     from './linkPopup.js';

export class WYSIWYGEditor {
  /**
   * @param {object}      options
   * @param {HTMLElement} options.container        - Mount element (required)
   * @param {string}      [options.initialContent] - HTML string to pre-populate
   * @param {Function}    [options.onChange]        - ({ html: string, json: object }) => void
   * @param {object[]}    [options.plugins]         - Optional plugin array (markdown, saving, etc.)
   *                                                  Each plugin receives the editor instance after init.
   */
  constructor({ container, initialContent = '', onChange, plugins = [] } = {}) {
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('WYSIWYGEditor: `container` must be an HTMLElement');
    }

    // 1. Styles (idempotent — injected once per page)
    injectStyles();

    // 2. Build the wrapper skeleton
    this._container = container;
    this._container.classList.add('wysiwyg-container');

    this._onChange = onChange ?? null;

    // Live region for screen reader announcements
    this._status = this._buildStatus();
    this._container.appendChild(this._status);

    // Editor mount point
    const editorMount = document.createElement('div');
    editorMount.id = this._uniqueId('wysiwyg-editor');
    editorMount.setAttribute('role', 'textbox');
    editorMount.setAttribute('aria-multiline', 'true');
    editorMount.setAttribute('aria-label', 'Text editor');
    this._container.appendChild(editorMount);

    // 3. Core editor (ProseMirror view)
    this._core = new EditorCore({
      mount: editorMount,
      initialContent,
      onTransaction: () => this._handleTransaction(),
    });

    // 4. Link popup  (must exist before Toolbar so Toolbar can reference it)
    this._linkPopup = new LinkPopup({
      container: this._container,
      getView:   () => this._core.view,
      onApply:   () => this._announce('Link added.'),
    });

    // 5. Toolbar (prepends itself into container)
    this._toolbar = new Toolbar({
      container:     this._container,
      getView:       () => this._core.view,
      onLinkRequest: (btn) => this._linkPopup.open(btn),
    });

    // 6. Optional plugins
    this._plugins = [];
    plugins.forEach((plugin) => this._registerPlugin(plugin));
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  _handleTransaction() {
    this._toolbar.syncActiveStates();

    if (this._onChange) {
      this._onChange({
        html: this.getHTML(),
        json: this.getJSON(),
      });
    }
  }

  _announce(message) {
    if (!this._status) return;
    // Briefly clear then set — forces re-announcement in all screen readers
    this._status.textContent = '';
    requestAnimationFrame(() => {
      this._status.textContent = message;
    });
  }

  _buildStatus() {
    const el = document.createElement('div');
    el.className = 'wysiwyg-status';
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    return el;
  }

  _uniqueId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
  }

  _registerPlugin(plugin) {
    if (typeof plugin !== 'function') {
      console.warn('WYSIWYGEditor: plugin must be a function, got', typeof plugin);
      return;
    }
    try {
      plugin(this);
      this._plugins.push(plugin);
    } catch (err) {
      console.warn('WYSIWYGEditor: plugin failed to initialize:', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * @returns {string} Current document as an HTML string
   */
  getHTML() {
    return this._core.getHTML();
  }

  /**
   * @returns {object} Current document as a ProseMirror JSON object
   */
  getJSON() {
    return this._core.getJSON();
  }

  /**
   * Replace the editor content with an HTML string.
   * @param {string} html
   */
  setContent(html) {
    this._core.setContent(html);
    this._toolbar.syncActiveStates();
  }

  /**
   * Programmatically focus the editor.
   */
  focus() {
    this._core.focus();
  }

  /**
   * Post a message to the screen reader live region.
   * @param {string} message
   */
  announce(message) {
    this._announce(message);
  }

  /**
   * Tear down the editor — removes all DOM, event listeners, and ProseMirror views.
   */
  destroy() {
    this._toolbar?.destroy();
    this._linkPopup?.destroy();
    this._core?.destroy();
    this._container.classList.remove('wysiwyg-container');
    this._container.innerHTML = '';
  }

  // Expose internals for plugin authors
  get view()      { return this._core?.view; }
  get state()     { return this._core?.state; }
  get toolbar()   { return this._toolbar; }
  get linkPopup() { return this._linkPopup; }
}

// Re-export schema and helpers for advanced consumers / plugin authors
export { schema }        from './schema.js';
export { commands, markActive, blockActive, inList } from './commands.js';