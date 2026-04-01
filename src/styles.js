const STYLE_ID = 'wysiwyg-editor-styles';

const CSS = /* css */ `
/* ---- Reset ---- */
.wysiwyg-container * {
  box-sizing: border-box;
}

/* ---- Utility ---- */
.wysiwyg-visually-hidden {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

.wysiwyg-hidden {
  display: none !important;
}

/* ---- Outer wrapper ---- */
.wysiwyg-container {
  background: #fff;
  /* 37652: border was #d1d1d1 (~1.6:1 on white) — now #767676 (4.5:1) */
  border: 2px solid #767676;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,.10);
  font-family: sans-serif;
}

/* ---- Toolbar ---- */
.wysiwyg-toolbar {
  display: flex;
  gap: 2px;
  padding: 8px;
  background: #f0f0f0;
  border-bottom: 2px solid #767676;
  flex-wrap: wrap;
}

.wysiwyg-toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  pointer-events: none; /* optional — keeps tooltip visible if removed */
}
  
.wysiwyg-toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  background: #fff;
  border-radius: 3px;
  cursor: pointer;
  color: #333;
  transition: background .15s, border-color .15s;
  position: relative;
}
.wysiwyg-toolbar-btn:hover {
  background: #e8e8e8;
  border-color: #767676;
}
.wysiwyg-toolbar-btn:focus {
  outline: 2px solid #0066cc;
  outline-offset: 1px;
  z-index: 1;
}
.wysiwyg-toolbar-btn:active {
  background: #d1d1d1;
}
.wysiwyg-toolbar-btn.active {
  background: #0066cc;
  color: #fff;
  border-color: #0052a3;
}
.wysiwyg-toolbar-btn.active svg {
  stroke: #fff;
  fill: #fff;
}
.wysiwyg-toolbar-btn.active:hover {
  background: #0052a3;
}
.wysiwyg-toolbar-btn svg {
  pointer-events: none;
}



/* ---- ProseMirror / Tiptap surface ---- */
.wysiwyg-container .tiptap,
.wysiwyg-container .ProseMirror {
  min-height: 400px;
  max-height: 600px;
  padding: 1.5rem;
  font-size: 16px;
  line-height: 1.6;
  outline: none;
  overflow-y: auto;
  font-family: sans-serif;
}
.wysiwyg-container .tiptap:focus,
.wysiwyg-container .ProseMirror:focus {
  outline: 2px solid #0066cc;
  outline-offset: -2px;
}

/* ---- Editor typography ---- */
.wysiwyg-container .ProseMirror h2,
.wysiwyg-container .tiptap h2 {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.3;
}
.wysiwyg-container .ProseMirror h3,
.wysiwyg-container .tiptap h3 {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
}
.wysiwyg-container .ProseMirror p,
.wysiwyg-container .tiptap p {
  margin: 0.5rem 0;
}

/* ---- Links ---- */
.wysiwyg-container .ProseMirror a,
.wysiwyg-container .tiptap a {
  color: #0066cc;
  text-decoration: underline;
}
.wysiwyg-container .ProseMirror a:hover,
.wysiwyg-container .tiptap a:hover {
  color: #0052a3;
}

/* ---- Lists ---- */
.wysiwyg-container .ProseMirror ul,
.wysiwyg-container .ProseMirror ol,
.wysiwyg-container .tiptap ul,
.wysiwyg-container .tiptap ol {
  margin: 0.5rem 0;
  padding-left: 2rem;
}
.wysiwyg-container .ProseMirror li,
.wysiwyg-container .tiptap li {
  margin: 0.25rem 0;
}

/* ---- Status live region ---- */
.wysiwyg-status {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}

/* ---- Link popup overlay ---- */
.wysiwyg-link-popup {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  /* 37655: allow scroll on small viewports */
  overflow-y: auto;
  padding: 1rem;
}
.wysiwyg-link-popup[hidden] {
  display: none;
}

/* ---- Link popup dialog ---- */
.wysiwyg-link-popup-content {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,.3);
  width: 100%;
  max-width: 480px;
  /* 37655: don't constrain height so it reflows at 400% zoom */
}
.wysiwyg-link-popup-content h2 {
  font-size: 1.25rem;
  margin: 0 0 1rem;
  color: #1a1a1a;
}
.wysiwyg-link-popup-content label {
  display: block;
  margin-bottom: .35rem;
  font-weight: 500;
  color: #1a1a1a;
}

/* 37656: format hint text under label */
.wysiwyg-field-hint {
  display: block;
  font-size: 0.875rem;
  font-weight: 400;
  color: #555;
  margin-bottom: .35rem;
}

.wysiwyg-link-popup-content input {
  width: 100%;
  padding: .75rem;
  /* 37652: input border #d1d1d1 failed — now #767676 */
  border: 2px solid #767676;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: .5rem;
}
.wysiwyg-link-popup-content input:focus {
  outline: 2px solid #0066cc;
  outline-offset: 0;
  border-color: #0066cc;
}

/* 37653/54: visible error text */
.wysiwyg-field-error {
  display: block;
  color: #cc0000;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: .75rem;
  /* icon prefix to not rely on color alone */
}
.wysiwyg-field-error:not([hidden])::before {
}

.wysiwyg-input-invalid {
  border-color: #cc0000 !important;
}
.wysiwyg-input-invalid:focus {
  outline-color: #cc0000 !important;
}

.wysiwyg-link-popup-buttons {
  display: flex;
  gap: .75rem;
  justify-content: flex-end;
  /* 37655: wrap on tiny screens */
  flex-wrap: wrap;
  margin-top: 1rem;
}
.wysiwyg-link-cancel,
.wysiwyg-link-apply {
  padding: .6rem 1.25rem;
  border: 2px solid #767676;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: background .15s;
  /* 37655: allow buttons to grow on narrow viewports */
  flex: 1 1 auto;
  min-width: 80px;
  text-align: center;
}
.wysiwyg-link-cancel {
  background: #fff;
  color: #1a1a1a;
}
.wysiwyg-link-cancel:hover  { background: #f0f0f0; }
.wysiwyg-link-cancel:focus  { outline: 2px solid #0066cc; outline-offset: 2px; }
.wysiwyg-link-apply {
  background: #0066cc;
  color: #fff;
  border-color: #0052a3;
}
.wysiwyg-link-apply:hover  { background: #0052a3; }
.wysiwyg-link-apply:focus  { outline: 2px solid #003d7a; outline-offset: 2px; }

/* ---- Body scroll lock ---- */
body.wysiwyg-no-scroll { overflow: hidden; }

@media (max-width: 640px) {
  .wysiwyg-link-popup-content {
    padding: 1.25rem;
  }
  .wysiwyg-toolbar { padding: 4px; }
  .wysiwyg-toolbar-btn { width: 32px; height: 32px; }
}

@media (forced-colors: active) {
  .wysiwyg-toolbar {
    border-bottom: 2px solid ButtonText;
    background: Canvas;
  }
  .wysiwyg-toolbar-btn {
    border: 2px solid ButtonText;
    background: ButtonFace;
    color: ButtonText;
    forced-color-adjust: none;
  }
  .wysiwyg-toolbar-btn:hover {
    background: Highlight;
    color: HighlightText;
    border-color: HighlightText;
  }
  .wysiwyg-toolbar-btn:focus {
    outline: 3px solid Highlight;
    outline-offset: 1px;
  }
  .wysiwyg-toolbar-btn.active {
    background-color: ButtonText;
    color: ButtonFace;
    border-color: ButtonText;
    forced-color-adjust: none;
  }
  .wysiwyg-toolbar-btn svg {
    fill: currentColor;
    stroke: currentColor;
  }

  .wysiwyg-toolbar-btn.active svg {
    fill: ButtonFace;
    color: ButtonFace;
    stroke: ButtonFace;
  }

  /* Editor surface */
  .wysiwyg-container {
    border-color: ButtonText;
  }
  .wysiwyg-container .tiptap,
  .wysiwyg-container .ProseMirror {
    background: Canvas;
    color: CanvasText;
  }
  .wysiwyg-container .tiptap:focus,
  .wysiwyg-container .ProseMirror:focus {
    outline: 3px solid Highlight;
  }
  /* Link popup */
  .wysiwyg-link-popup {
    background: Canvas;
  }
  .wysiwyg-link-popup-content {
    border: 2px solid ButtonText;
    background: Canvas;
    color: CanvasText;
    box-shadow: none;
  }
  .wysiwyg-link-popup-content input {
    border: 2px solid ButtonText;
    background: Field;
    color: FieldText;
  }

  .wysiwyg-link-cancel { background: ButtonFace; color: ButtonText; border: 2px solid ButtonText; forced-color-adjust: none; }

.wysiwyg-link-apply { background: ButtonText; color: ButtonFace; border: 2px solid ButtonFace; forced-color-adjust: none; }

.wysiwyg-link-apply:hover { background: Highlight; color: HighlightText; border-color: HighlightText; }

.wysiwyg-link-cancel:hover {
  background: Highlight;
  color: HighlightText;
  border-color: HighlightText;
}


  .wysiwyg-input-invalid {
    border-color: LinkText !important;
  }
  .wysiwyg-field-error {
    color: LinkText;
  }
  .wysiwyg-field-hint {
    color: CanvasText;
  }
}
`;

export function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id          = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}