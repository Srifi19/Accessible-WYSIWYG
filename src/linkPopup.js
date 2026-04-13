function addProtocol(url) {
  return /^https?:\/\//i.test(url) ? url : 'https://' + url
}

function isValidUrl(str) {
  try {
    const u = new URL(str)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

function getFocusable(container) {
  return Array.from(container.querySelectorAll(
    'a[href], input:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length))
}

// ─────────────────────────────────────────────────────────────
// TRANSLATIONS
// ─────────────────────────────────────────────────────────────

const STRINGS = {
  en: {
    title: "Insert link",
    urlLabel: "URL (required)",
    urlHint: "Enter a full web address, e.g. https://example.com",
    textLabel: "Display link text (required)",
    cancel: "Cancel",
    apply: "Apply",
    urlRequired: "URL is required. Please enter a web address, e.g. https://example.com",
    urlInvalid: "Please enter a valid URL, e.g. https://example.com",
    textRequired: "Display Link text is required.",
    linkAdded: "Link added.",
    linkFailed: "No text selected. Link not inserted."
  },

  fr: {
    title: "Insérer un lien",
    urlLabel: "URL (obligatoire)",
    urlHint: "Entrez une adresse complète, ex. https://exemple.com",
    textLabel: "Texte du lien (obligatoire)",
    cancel: "Annuler",
    apply: "Appliquer",
    urlRequired: "L’URL est obligatoire. Veuillez entrer une adresse web, ex. https://exemple.com",
    urlInvalid: "Veuillez entrer une URL valide, ex. https://exemple.com",
    textRequired: "Le texte du lien est obligatoire.",
    linkAdded: "Lien ajouté.",
    linkFailed: "Aucun texte sélectionné. Le lien n’a pas été inséré."
  }
}

export class LinkPopup {
  constructor({ container, getEditor, onApply, language = 'en' }) {
    this._getEditor  = getEditor
    this._onApply    = onApply
    this._language   = language
    this._messages   = STRINGS[language] ?? STRINGS.en

    this._opener     = null
    this._urlInput   = null
    this._lblInput   = null
    this._urlError   = null
    this._lblError   = null
    this._el         = null
    this._liveRegion = null

    this._build(container)
    this._bind()
    this._applyTranslations()
  }

  // ─────────────────────────────────────────────────────────────
  // BUILD UI
  // ─────────────────────────────────────────────────────────────

  _build(container) {
    this._el = document.createElement('div')
    this._el.className = 'wysiwyg-link-popup'
    this._el.setAttribute('hidden', '')
    this._el.setAttribute('role', 'dialog')
    this._el.setAttribute('aria-modal', 'true')
    this._el.setAttribute('aria-labelledby', 'wysiwyg-link-popup-title')

    this._el.innerHTML = `
      <div class="wysiwyg-link-popup-content">
        <h2 id="wysiwyg-link-popup-title"></h2>

        <label for="wysiwyg-link-url" class="wysiwyg-label-strong">
          <span class="wysiwyg-url-label"></span>
          <span class="wysiwyg-field-hint wysiwyg-url-hint"></span>
        </label>
        <input
          type="url"
          id="wysiwyg-link-url"
          aria-required="true"
          aria-describedby="wysiwyg-link-url-error"
          autocomplete="url"
        />
        <span id="wysiwyg-link-url-error" class="wysiwyg-field-error" aria-live="polite"></span>

        <label for="wysiwyg-link-display" class="wysiwyg-label-strong">
          <span class="wysiwyg-text-label"></span>
        </label>
        <input
          type="text"
          id="wysiwyg-link-display"
          aria-required="true"
          aria-describedby="wysiwyg-link-display-error"
          autocomplete="off"
        />
        <span id="wysiwyg-link-display-error" class="wysiwyg-field-error" aria-live="polite"></span>

        <div class="wysiwyg-link-popup-buttons">
          <button type="button" class="wysiwyg-link-cancel"></button>
          <button type="button" class="wysiwyg-link-apply"></button>
        </div>
      </div>
    `

    this._urlInput = this._el.querySelector('#wysiwyg-link-url')
    this._lblInput = this._el.querySelector('#wysiwyg-link-display')
    this._urlError = this._el.querySelector('#wysiwyg-link-url-error')
    this._lblError = this._el.querySelector('#wysiwyg-link-display-error')

    // Live region
    this._liveRegion = document.getElementById('wysiwyg-sr-announce')
    if (!this._liveRegion) {
      this._liveRegion = document.createElement('span')
      this._liveRegion.id = 'wysiwyg-sr-announce'
      this._liveRegion.setAttribute('aria-live', 'polite')
      this._liveRegion.setAttribute('aria-atomic', 'true')
      this._liveRegion.className = 'wysiwyg-visually-hidden'
      document.body.appendChild(this._liveRegion)
    }

    container.appendChild(this._el)
  }

  // ─────────────────────────────────────────────────────────────
  // APPLY TRANSLATIONS
  // ─────────────────────────────────────────────────────────────

  _applyTranslations() {
    const t = this._messages

    this._el.querySelector('#wysiwyg-link-popup-title').textContent = t.title
    this._el.querySelector('.wysiwyg-url-label').textContent = t.urlLabel
    this._el.querySelector('.wysiwyg-url-hint').textContent = t.urlHint
    this._el.querySelector('.wysiwyg-text-label').textContent = t.textLabel

    this._el.querySelector('.wysiwyg-link-cancel').textContent = t.cancel
    this._el.querySelector('.wysiwyg-link-apply').textContent = t.apply
  }

  setLanguage(lang) {
    this._language = lang
    this._messages = STRINGS[lang] ?? STRINGS.en
    this._applyTranslations()
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT BINDINGS
  // ─────────────────────────────────────────────────────────────

  _bind() {
    this._el.querySelector('.wysiwyg-link-apply').addEventListener('click', () => this.apply())
    this._el.querySelector('.wysiwyg-link-cancel').addEventListener('click', () => this.close())

    this._el.addEventListener('click', (e) => {
      if (e.target === this._el) this.close()
    })

    this._el.addEventListener('keydown', (e) => {
      if (this._el.hasAttribute('hidden')) return

      if (e.key === 'Escape') {
        e.preventDefault()
        this.close()
        return
      }

      if (e.key === 'Tab') {
        const focusable = getFocusable(this._el)
        if (!focusable.length) return
        const first = focusable[0]
        const last  = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    })

    ;[this._urlInput, this._lblInput].forEach((input) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); this.apply() }
      })
    })

    this._urlInput.addEventListener('input', () => {
      if (this._urlInput.value.trim()) this._setUrlError(null)
    })

    this._lblInput.addEventListener('input', () => {
      if (this._lblInput.value.trim()) this._setLabelError(null)
    })
  }

  // ─────────────────────────────────────────────────────────────
  // OPEN / CLOSE
  // ─────────────────────────────────────────────────────────────

  open(openerBtn = null) {
    this._opener = openerBtn ?? document.activeElement
    this._urlInput.value = ''
    this._lblInput.value = ''
    this._setUrlError(null)
    this._setLabelError(null)

    const editor = this._getEditor()
    if (editor) {
      const { from, to, empty } = editor.state.selection
      if (!empty) {
        this._lblInput.value = editor.state.doc.textBetween(from, to, ' ')
      }
      const linkAttrs = editor.getAttributes('link')
      if (linkAttrs?.href) {
        this._urlInput.value = linkAttrs.href
      }
    }

    this._el.removeAttribute('hidden')
    document.body.classList.add('wysiwyg-no-scroll')
    setTimeout(() => this._urlInput.focus(), 0)
  }

  close() {
    this._el.setAttribute('hidden', '')
    document.body.classList.remove('wysiwyg-no-scroll')

    const opener = this._opener
    this._opener = null

    const isVisible = (el) =>
      el && el.getAttribute('tabindex') !== '-1' &&
      !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)

    isVisible(opener)
      ? opener.focus()
      : this._getEditor()?.commands.focus()
  }

  // ─────────────────────────────────────────────────────────────
  // APPLY LINK
  // ─────────────────────────────────────────────────────────────

  apply() {
    const t = this._messages

    const rawUrl = this._urlInput.value.trim()
    const rawLabel = this._lblInput.value.trim()

    let firstInvalid = null

    // URL validation
    if (!rawUrl) {
      this._setUrlError(t.urlRequired)
      firstInvalid = firstInvalid || this._urlInput
    } else {
      const url = addProtocol(rawUrl)
      if (!isValidUrl(url)) {
        this._setUrlError(t.urlInvalid)
        firstInvalid = firstInvalid || this._urlInput
      } else {
        this._setUrlError(null)
      }
    }

    // Label validation
    if (!rawLabel) {
      this._setLabelError(t.textRequired)
      firstInvalid = firstInvalid || this._lblInput
    } else {
      this._setLabelError(null)
    }

    if (firstInvalid) {
      firstInvalid.focus()
      return
    }

    const url = addProtocol(rawUrl)
    const editor = this._getEditor()
    if (!editor) return

    const success = editor.chain().focus()
      .insertContent(`<a href="${url}">${rawLabel}</a>`)
      .run()

    if (!success) {
      this._announce(t.linkFailed)
      this._urlInput.focus()
      return
    }

    this._announce(t.linkAdded)
    this._onApply?.()
    setTimeout(() => this.close(), 100)
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────

  _announce(message) {
    this._liveRegion.textContent = ''
    requestAnimationFrame(() => {
      this._liveRegion.textContent = message
    })
  }

  _setUrlError(message) {
    if (message) {
      this._urlError.textContent = message
      this._urlInput.setAttribute('aria-invalid', 'true')
      this._urlInput.classList.add('wysiwyg-input-invalid')
    } else {
      this._urlError.textContent = ''
      this._urlInput.removeAttribute('aria-invalid')
      this._urlInput.classList.remove('wysiwyg-input-invalid')
    }
  }

  _setLabelError(message) {
    if (message) {
      this._lblError.textContent = message
      this._lblInput.setAttribute('aria-invalid', 'true')
      this._lblInput.classList.add('wysiwyg-input-invalid')
    } else {
      this._lblError.textContent = ''
      this._lblInput.removeAttribute('aria-invalid')
      this._lblInput.classList.remove('wysiwyg-input-invalid')
    }
  }

  get el() { return this._el }

  destroy() {
    this._liveRegion?.remove()
    this._el?.remove()
    this._el = null
  }
}
