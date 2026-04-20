const STYLE_ID = 'wysiwyg-editor-styles';

const CSS = /* css */ `
:host {
  all: initial;
  font-family: sans-serif;
  color: #000;
}

/* Reset only inherited properties */
:host * {
  box-sizing: border-box;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
}

.wysiwyg-container strong,
.wysiwyg-container b {
  font-weight: 700;
  color: #111;
}

.wysiwyg-container em,
.wysiwyg-container i {
  font-style: italic;
}




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
  pointer-events: none;
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
}
.wysiwyg-link-popup-content h2 {
  font-size: 1.25rem;
  margin: 0 0 1rem;
  color: #1a1a1a;
}
.wysiwyg-link-popup-content label {
  display: block;
  margin-bottom: .35rem;
  color: #1a1a1a;
}

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

.wysiwyg-field-error {
  display: block;
  color: #cc0000;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: .75rem;
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

/* body scroll lock is global; keep it in page CSS or inject separately */
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
    background: Highlight;
    color: HighlightText;
    border-color: HighlightText;
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
  .wysiwyg-link-cancel:hover { background: Highlight; color: HighlightText; border-color: HighlightText; }
  .wysiwyg-link-apply:focus { background: Highlight; color: HighlightText; border-color: HighlightText; }
  .wysiwyg-link-cancel:focus { background: Highlight; color: HighlightText; border-color: HighlightText; }

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

export function injectStyles(root) {
  const target = root instanceof ShadowRoot ? root : document.head;
  if (target.getElementById && target.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  target.appendChild(style);
}
