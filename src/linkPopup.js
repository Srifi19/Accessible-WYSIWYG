// LinkPopup.js
// WCAG fixes applied:
//   37653 — Visible error message when URL empty (not just aria-invalid)
//   37654 — Invalid URL format validation with clear error
//   37691 — "Label" renamed to "Display Text" (more descriptive)
//   37656 — URL format instructions in label, not only placeholder
//   37476 — NVDA announced via aria-live region after link applied
//   37655 — Reflow: modal scrollable at 320px/400% zoom (CSS)

function addProtocol(url) {
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    // Must have a real hostname with a dot (e.g. not just "https://google")
    return u.hostname.includes('.');
  } catch {
    return false;
  }
}

function getFocusable(container) {
  return Array.from(container.querySelectorAll(
    'a[href], input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}

export class LinkPopup {
  constructor({ container, getEditor, onApply }) {
    this._getEditor  = getEditor;
    this._onApply    = onApply;
    this._opener     = null;
    this._urlInput   = null;
    this._lblInput   = null;
    this._urlError   = null;
    this._el         = null;

    this._build(container);
    this._bind();
  }

  _build(container) {
    this._el = document.createElement('div');
    this._el.className = 'wysiwyg-link-popup';
    this._el.setAttribute('hidden', '');
    this._el.setAttribute('aria-hidden', 'true');
    this._el.setAttribute('role', 'dialog');
    this._el.setAttribute('aria-modal', 'true');
    this._el.setAttribute('aria-labelledby', 'wysiwyg-link-popup-title');

    // 37656: format instructions in label text, not only placeholder
    // 37691: "Label" → "Display Text" for clarity
    // 37653/54: error message element per field, associated via aria-describedby
    this._el.innerHTML = `
      <div class="wysiwyg-link-popup-content">
        <h2 id="wysiwyg-link-popup-title">Insert link</h2>

        <label for="wysiwyg-link-url">
          <b>URL (required)</b>
          <span class="wysiwyg-field-hint">Enter a full web address, e.g. https://example.com</span>
        </label>
        <input
          type="url"
          id="wysiwyg-link-url"
          placeholder="https://example.com"
          aria-required="true"
          aria-describedby="wysiwyg-link-url-error"
          autocomplete="url"
        />
        <span id="wysiwyg-link-url-error" class="wysiwyg-field-error" aria-live="polite" hidden></span>

        <label for="wysiwyg-link-display">
          <b>Display Text (optional)</b>
        </label>
        <input
          type="text"
          id="wysiwyg-link-display"
          placeholder="Visible link text"
          autocomplete="off"
        />

        <div class="wysiwyg-link-popup-buttons">
          <button type="button" class="wysiwyg-link-cancel">Cancel</button>
          <button type="button" class="wysiwyg-link-apply">Apply</button>
        </div>
      </div>
    `;

    this._urlInput = this._el.querySelector('#wysiwyg-link-url');
    this._lblInput = this._el.querySelector('#wysiwyg-link-display');
    this._urlError = this._el.querySelector('#wysiwyg-link-url-error');
    container.appendChild(this._el);
  }

  _bind() {
    this._el.querySelector('.wysiwyg-link-apply').addEventListener('click', () => this.apply());
    this._el.querySelector('.wysiwyg-link-cancel').addEventListener('click', () => this.close());

    // Click on backdrop closes modal
    this._el.addEventListener('click', (e) => {
      if (e.target === this._el) this.close();
    });

    // Focus trap + Escape
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
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    });

    // Enter in either input submits
    [this._urlInput, this._lblInput].forEach((input) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.apply(); }
      });
    });

    // Clear error as soon as user starts correcting
    this._urlInput.addEventListener('input', () => {
      if (this._urlInput.value.trim()) this._setError(null);
    });
  }

  open(openerBtn = null) {
    this._opener = openerBtn ?? document.activeElement;
    this._urlInput.value = '';
    this._lblInput.value = '';
    this._setError(null);

    const editor = this._getEditor();
    if (editor) {
      const { from, to, empty } = editor.state.selection;

      if (!empty) {
        this._lblInput.value = editor.state.doc.textBetween(from, to, ' ');
      }

      const linkAttrs = editor.getAttributes('link');
      if (linkAttrs?.href) {
        this._urlInput.value = linkAttrs.href;
      }
    }

    this._el.removeAttribute('hidden');
    this._el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('wysiwyg-no-scroll');
    setTimeout(() => this._urlInput.focus(), 0);
  }

  apply() {
    const raw = this._urlInput.value.trim();

    // 37653: visible error when field empty
    if (!raw) {
      this._setError('URL is required. Please enter a web address.');
      this._urlInput.focus();
      return;
    }

    const url = addProtocol(raw);

    // 37654: validate format — must have a hostname with a dot
    if (!isValidUrl(url)) {
      this._setError('Please enter a valid URL, e.g. https://example.com');
      this._urlInput.focus();
      return;
    }

    this._setError(null);

    const editor = this._getEditor();
    if (!editor) return;

    const label = this._lblInput.value.trim();

    if (label && editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${url}">${label}</a>`).run();
    } else if (label) {
      editor.chain().focus().deleteSelection().insertContent(`<a href="${url}">${label}</a>`).run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }

    // 37476: announce to NVDA/screen readers via the parent live region
    this._onApply?.();
    this.close();
  }

  close() {
    this._el.setAttribute('hidden', '');
    this._el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('wysiwyg-no-scroll');

    const opener = this._opener;
    this._opener = null;

    const isVisible = (el) =>
      el && el.getAttribute('tabindex') !== '-1' &&
      !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

    isVisible(opener)
      ? opener.focus()
      : this._getEditor()?.commands.focus();
  }

  // 37653/54: show/hide the visible error text AND set aria-invalid
  _setError(message) {
    if (message) {
      this._urlError.textContent = message;
      this._urlError.removeAttribute('hidden');
      this._urlInput.setAttribute('aria-invalid', 'true');
      this._urlInput.classList.add('wysiwyg-input-invalid');
    } else {
      this._urlError.textContent = '';
      this._urlError.setAttribute('hidden', '');
      this._urlInput.removeAttribute('aria-invalid');
      this._urlInput.classList.remove('wysiwyg-input-invalid');
    }
  }

  get el() { return this._el; }
  destroy() { this._el?.remove(); this._el = null; }
}