import { schema } from './schema.js';

// ---------------------------------------------------------------------------

function addProtocolIfMissing(url) {
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

function isValidUrl(str) {
  try {
    return !!(new URL(str).hostname);
  } catch {
    return false;
  }
}

function getFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], area[href], input:not([disabled]), button:not([disabled]), ' +
      'textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}

// ---------------------------------------------------------------------------

export class LinkPopup {
  /**
   * @param {object}   options
   * @param {HTMLElement} options.container  - Appended inside this element
   * @param {Function} options.getView       - Returns the current EditorView
   * @param {Function} [options.onApply]     - Called after a link is successfully applied
   * @param {Function} [options.onClose]     - Called after the popup closes
   */
  constructor({ container, getView, onApply, onClose }) {
    this._getView  = getView;
    this._onApply  = onApply;
    this._onClose  = onClose;
    this._opener   = null;
    this._el       = null;
    this._urlInput = null;
    this._lblInput = null;

    this._build(container);
    this._bind();
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  _build(container) {
    this._el = document.createElement('div');
    this._el.className = 'wysiwyg-link-popup';
    this._el.setAttribute('hidden', '');
    this._el.setAttribute('aria-hidden', 'true');
    this._el.setAttribute('role', 'dialog');
    this._el.setAttribute('aria-modal', 'true');
    this._el.setAttribute('aria-labelledby', 'wysiwyg-link-popup-title');

    this._el.innerHTML = `
      <div class="wysiwyg-link-popup-content">
        <h2 id="wysiwyg-link-popup-title">Insert link</h2>

        <label for="wysiwyg-link-url"><b>URL (required)</b></label>
        <input type="url" id="wysiwyg-link-url" placeholder="https://example.com" aria-required="true" />

        <label for="wysiwyg-link-label"><b>Label (optional)</b></label>
        <input type="text" id="wysiwyg-link-label" placeholder="Link text" />

        <div class="wysiwyg-link-popup-buttons">
          <button type="button" class="wysiwyg-link-cancel">Cancel</button>
          <button type="button" class="wysiwyg-link-apply">Apply</button>
        </div>
      </div>
    `;

    this._urlInput = this._el.querySelector('#wysiwyg-link-url');
    this._lblInput = this._el.querySelector('#wysiwyg-link-label');

    container.appendChild(this._el);
  }

  _bind() {
    this._el.querySelector('.wysiwyg-link-apply').addEventListener('click', () => this.apply());
    this._el.querySelector('.wysiwyg-link-cancel').addEventListener('click', () => this.close());

    // Dismiss on backdrop click
    this._el.addEventListener('click', (e) => {
      if (e.target === this._el) this.close();
    });

    // Keyboard: Escape closes, Enter submits, Tab traps focus
    this._el.addEventListener('keydown', (e) => {
      if (this._el.hasAttribute('hidden')) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
        return;
      }

      if (e.key === 'Tab') {
        const focusable = getFocusable(this._el);
        if (!focusable.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    [this._urlInput, this._lblInput].forEach((input) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.apply();
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Open the popup, optionally pre-populating inputs from the current selection.
   * @param {Element} [openerBtn] - Button that triggered the popup (for focus return)
   */
  open(openerBtn = null) {
    this._opener = openerBtn ?? document.activeElement;

    this._urlInput.value = '';
    this._lblInput.value = '';
    this._markUrlInvalid(false);

    // Pre-populate from selection / cursor
    const view = this._getView();
    if (view) {
      const { state } = view;
      const { selection } = state;
      const linkMark = schema.marks.link;

      if (!selection.empty) {
        const text = state.doc.textBetween(selection.from, selection.to, ' ');
        if (text) this._lblInput.value = text;

        state.doc.nodesBetween(selection.from, selection.to, (node) => {
          const mark = node.marks?.find((m) => m.type === linkMark);
          if (mark) this._urlInput.value = mark.attrs.href ?? '';
        });
      } else {
        const $pos = selection.$from;
        const mark = $pos.marks().find((m) => m.type === linkMark);
        if (mark) {
          this._urlInput.value = mark.attrs.href ?? '';
          this._lblInput.value = $pos.parent.textContent;
        }
      }
    }

    this._el.removeAttribute('hidden');
    this._el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('wysiwyg-no-scroll');

    setTimeout(() => this._urlInput.focus(), 0);
  }

  apply() {
    const rawUrl = this._urlInput.value.trim();

    if (!rawUrl) {
      this._markUrlInvalid(true);
      this._urlInput.focus();
      return;
    }

    const url = addProtocolIfMissing(rawUrl);
    if (!isValidUrl(url)) {
      this._markUrlInvalid(true);
      this._urlInput.focus();
      return;
    }

    this._markUrlInvalid(false);

    const view = this._getView();
    if (!view) return;

    const { state, dispatch } = view;
    const { selection } = state;
    const { from, to, empty } = selection;
    const label = this._lblInput.value.trim() || url;
    const linkMark = schema.marks.link.create({ href: url });

    let tr = state.tr.insertText(label, from, empty ? from : to);
    tr = tr.addMark(from, from + label.length, linkMark);
    dispatch(tr.scrollIntoView());

    this._onApply?.();
    this.close();
    view.focus();
  }

  close() {
    this._el.setAttribute('hidden', '');
    this._el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('wysiwyg-no-scroll');

    const opener = this._opener;
    this._opener = null;

    const isFocusable = (el) => {
      if (!el) return false;
      return el.getAttribute('tabindex') !== '-1' &&
        !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    };

    if (isFocusable(opener)) {
      opener.focus();
    } else {
      this._getView()?.focus();
    }

    this._onClose?.();
  }

  get el() {
    return this._el;
  }

  destroy() {
    this._el?.remove();
    this._el = null;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  _markUrlInvalid(invalid) {
    if (invalid) {
      this._urlInput.setAttribute('aria-invalid', 'true');
      this._urlInput.classList.add('wysiwyg-input-invalid');
    } else {
      this._urlInput.removeAttribute('aria-invalid');
      this._urlInput.classList.remove('wysiwyg-input-invalid');
    }
  }
}