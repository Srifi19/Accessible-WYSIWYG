// linkPopup.js
import { getEditorView, schema } from './editor.js';
import { TextSelection, NodeSelection } from "prosemirror-state";

// State
let linkPopupOpener = null;

// Elements
const linkPopup = document.querySelector('.link-popup');
const linkUrlInput = document.getElementById('link-url-input');
const linkLabelInput = document.getElementById('link-label-input');
const linkApplyBtn = document.querySelector('.link-popup-apply');
const linkCancelBtn = document.querySelector('.link-popup-cancel');

// Public API
export function setupLinkPopup() {
  linkApplyBtn.addEventListener('click', applyLink);
  linkCancelBtn.addEventListener('click', closeLinkPopup);

  [linkUrlInput, linkLabelInput].forEach((input) => {
    input.addEventListener('keydown', onInputKeydown);
  });

  linkPopup.addEventListener('click', (e) => {
    if (e.target === linkPopup) closeLinkPopup();
  });

  linkPopup.addEventListener('keydown', onPopupKeydown);
}

export function openLinkPopup(openerBtn = null) {
  linkPopupOpener = openerBtn || document.activeElement;

  linkPopup.removeAttribute('hidden');
  linkPopup.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');

  linkUrlInput.value = '';
  linkLabelInput.value = '';

  const view = getEditorView();
  const sel = view.state.selection;
  const linkMark = schema.marks.link;

  if (!sel.empty) {
    const selectedText = view.state.doc.textBetween(sel.from, sel.to, ' ');
    if (selectedText) linkLabelInput.value = selectedText;
    // check for existing link mark
    view.state.doc.nodesBetween(sel.from, sel.to, (node) => {
      const mark = node.marks?.find(m => m.type === linkMark);
      if (mark) linkUrlInput.value = mark.attrs.href || '';
    });
  } else {
    // cursor case
    const $pos = sel.$from;
    const mark = $pos.marks().find(m => m.type === linkMark);
    if (mark) {
      linkUrlInput.value = mark.attrs.href || '';
      linkLabelInput.value = $pos.parent.textContent;
    }
  }

  setTimeout(() => linkUrlInput.focus(), 0);
}


export function applyLink() {
  const rawUrl = linkUrlInput.value.trim();

  // Validate URL
  if (!rawUrl) {
    markUrlInvalid(true);
    linkUrlInput.focus();
    return;
  }

  const withProtocol = addProtocolIfMissing(rawUrl);
  if (!isValidUrl(withProtocol)) {
    markUrlInvalid(true);
    linkUrlInput.focus();
    return;
  }
  markUrlInvalid(false);

  const view = getEditorView();
  const { state, dispatch } = view;
  const sel = state.selection;
  const { from, to, empty } = sel;

  // If label is empty, use the URL as the label
  const label = linkLabelInput.value.trim() || withProtocol;

  const linkMark = schema.marks.link.create({ href: withProtocol });

  // --- CASE 1: Selection exists ---
  if (!empty) {
    let tr = state.tr.insertText(label, from, to);
    tr = tr.addMark(from, from + label.length, linkMark);
    dispatch(tr.scrollIntoView());
  }

  // --- CASE 2: Cursor only ---
  else {
    let tr = state.tr.insertText(label, from);
    tr = tr.addMark(from, from + label.length, linkMark);
    dispatch(tr.scrollIntoView());
  }

  // Announce to screen readers
  const status = document.getElementById("editor-status");
  if (status) status.textContent = "Link added.";

  // Close popup and return focus to editor (NVDA will announce the link)
  closeLinkPopup();
  view.focus();
}




export function closeLinkPopup() {
  linkPopup.setAttribute('hidden', '');
  linkPopup.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');

  if (linkPopupOpener && isFocusable(linkPopupOpener)) {
    linkPopupOpener.focus();
  } else {
    getEditorView()?.focus();
  }
  linkPopupOpener = null;
  markUrlInvalid(false);
}

// Internal helpers
function onInputKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    applyLink();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeLinkPopup();
  }
}

function onPopupKeydown(e) {
  if (linkPopup.hasAttribute('hidden')) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    closeLinkPopup();
    return;
  }
  if (e.key !== 'Tab') return;

  const focusable = getFocusableElements(linkPopup);
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      'a[href], area[href], input:not([disabled]), button:not([disabled]), ' +
      'textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(isVisible);
}

function isVisible(el) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function isFocusable(el) {
  if (!el) return false;
  const tabIndex = el.getAttribute('tabindex');
  return tabIndex !== '-1' && isVisible(el);
}

function addProtocolIfMissing(url) {
  return /^https?:\/\//i.test(url) ? url : 'https://' + url;
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return !!u.hostname;
  } catch {
    return false;
  }
}

function markUrlInvalid(invalid) {
  if (invalid) {
    linkUrlInput.setAttribute('aria-invalid', 'true');
    linkUrlInput.classList.add('input-invalid');
  } else {
    linkUrlInput.removeAttribute('aria-invalid');
    linkUrlInput.classList.remove('input-invalid');
  }
}
