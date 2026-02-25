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
  border: 1px solid #d1d1d1;
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
  background: #fafafa;
  border-bottom: 1px solid #d1d1d1;
  flex-wrap: wrap;
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
  border-color: #c1c1c1;
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

/* Bold icon: fill + stroke differ from the generic active rule */
.wysiwyg-toolbar-btn[data-command="bold"].active svg {
  fill: #fff;
  stroke: #fff;
}

/* Link / unlink: don't fill the path when active */
.wysiwyg-toolbar-btn[data-command="link"].active svg,
.wysiwyg-toolbar-btn[data-command="unlink"].active svg {
  fill: none;
  stroke: #fff;
}

/* ---- ProseMirror surface ---- */
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
.wysiwyg-container .ProseMirror:focus {
  outline: 2px solid #0066cc;
  outline-offset: -2px;
}

/* ---- Editor typography ---- */
.wysiwyg-container .ProseMirror h2 {
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.3;
}
.wysiwyg-container .ProseMirror h3 {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
}
.wysiwyg-container .ProseMirror p {
  margin: 0.5rem 0;
}

/* ---- Links ---- */
.wysiwyg-container .ProseMirror a {
  color: #0066cc;
  text-decoration: underline;
}
.wysiwyg-container .ProseMirror a:hover {
  color: #0052a3;
}
.wysiwyg-container .ProseMirror h2 a,
.wysiwyg-container .ProseMirror h3 a {
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
  text-decoration: underline;
}

/* ---- Lists ---- */
.wysiwyg-container .ProseMirror ul,
.wysiwyg-container .ProseMirror ol {
  margin: 0.5rem 0;
  padding-left: 2rem;
}
.wysiwyg-container .ProseMirror li {
  margin: 0.25rem 0;
}

/* ---- Status (live region) ---- */
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

/* ---- Link popup ---- */
.wysiwyg-link-popup {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.wysiwyg-link-popup[hidden] {
  display: none;
}
.wysiwyg-link-popup-content {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,.3);
  min-width: 400px;
  max-width: 90%;
  width: 480px;
}
.wysiwyg-link-popup-content h2 {
  font-size: 1.25rem;
  margin: 0 0 1rem;
  color: #1a1a1a;
}
.wysiwyg-link-popup-content label {
  display: block;
  margin-bottom: .5rem;
  font-weight: 500;
  color: #333;
}
.wysiwyg-link-popup-content input {
  width: 100%;
  padding: .75rem;
  border: 1px solid #d1d1d1;
  border-radius: 4px;
  font-size: 1rem;
  margin-bottom: 1.25rem;
}
.wysiwyg-link-popup-content input:focus {
  outline: 2px solid #0066cc;
  border-color: #0066cc;
}
.wysiwyg-input-invalid {
  border-color: #cc0000 !important;
  outline-color: #cc0000 !important;
}
.wysiwyg-link-popup-buttons {
  display: flex;
  gap: .75rem;
  justify-content: flex-end;
}
.wysiwyg-link-cancel,
.wysiwyg-link-apply {
  padding: .6rem 1.25rem;
  border: 1px solid #d1d1d1;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  font-weight: 500;
  transition: background .15s;
}
.wysiwyg-link-cancel {
  background: #fff;
  color: #333;
}
.wysiwyg-link-cancel:hover  { background: #f5f5f5; }
.wysiwyg-link-cancel:focus  { outline: 2px solid #0066cc; }
.wysiwyg-link-apply {
  background: #0066cc;
  color: #fff;
  border-color: #0066cc;
}
.wysiwyg-link-apply:hover  { background: #0052a3; border-color: #0052a3; }
.wysiwyg-link-apply:focus  { outline: 2px solid #003d7a; outline-offset: 2px; }

/* ---- Body scroll lock (applied by LinkPopup) ---- */
body.wysiwyg-no-scroll { overflow: hidden; }

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .wysiwyg-link-popup-content {
    min-width: auto;
    width: 92%;
    padding: 1.25rem;
  }
  .wysiwyg-toolbar { padding: 4px; }
  .wysiwyg-toolbar-btn { width: 32px; height: 32px; }
}
`;

export function injectStyles() {
  if (document.getElementById(STYLE_ID)) return; // already injected

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}