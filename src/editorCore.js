import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { DOMParser, DOMSerializer } from 'prosemirror-model';
import { history } from 'prosemirror-history';
import { schema } from './schema.js';
import { buildKeymap } from './keymap.js';

export class EditorCore {
  /**
   * @param {object} options
   * @param {HTMLElement} options.mount        - Element to mount the ProseMirror view into
   * @param {string}      [options.initialContent] - Optional HTML string to pre-populate
   * @param {Function}    [options.onTransaction]  - Called after every state update
   */
  constructor({ mount, initialContent = '', onTransaction } = {}) {
    if (!mount) throw new Error('EditorCore: `mount` element is required');

    this._onTransaction = onTransaction;
    this._view = null;

    this._init(mount, initialContent);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  _init(mount, initialContent) {
    const doc = initialContent
      ? this._parseHTML(initialContent)
      : undefined;

    const state = EditorState.create({
      schema,
      doc,
      plugins: [
        history(),
        ...buildKeymap(),
      ],
    });

    this._view = new EditorView(mount, {
      state,

      handleDOMEvents: {
        mousedown: (_view, event) => {
          const a = event.target?.closest?.('a');
          if (!a) return false;

          if (event.ctrlKey || event.metaKey) {
            const href = a.getAttribute('href');
            if (href) {
              event.preventDefault();
              window.open(href, '_blank', 'noopener,noreferrer');
              return true;
            }
          }

          return false;
        },
      },

      dispatchTransaction: (tr) => {
        const newState = this._view.state.apply(tr);
        this._view.updateState(newState);
        this._onTransaction?.();
      },
    });
  }

  _parseHTML(html) {
    const parser = DOMParser.fromSchema(schema);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return parser.parse(tmp);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** @returns {EditorView} */
  get view() {
    return this._view;
  }

  /** @returns {EditorState} */
  get state() {
    return this._view.state;
  }

  /** Serialize the current document to an HTML string */
  getHTML() {
    const serializer = DOMSerializer.fromSchema(schema);
    const fragment = serializer.serializeFragment(this._view.state.doc.content);
    const tmp = document.createElement('div');
    tmp.appendChild(fragment);
    return tmp.innerHTML;
  }

  /** Serialize the current document to a ProseMirror JSON object */
  getJSON() {
    return this._view.state.doc.toJSON();
  }

  /**
   * Replace editor content
   * @param {string} html - HTML string
   */
  setContent(html) {
    const doc = this._parseHTML(html);
    const state = EditorState.create({
      schema,
      doc,
      plugins: this._view.state.plugins,
    });
    this._view.updateState(state);
  }

  /** Focus the editor */
  focus() {
    this._view.focus();
  }

  /** Tear down the ProseMirror view and clean up */
  destroy() {
    this._view?.destroy();
    this._view = null;
  }
}