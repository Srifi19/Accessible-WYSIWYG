/**
 * commands.js
 * No .focus() on formatting commands — mousedown preventDefault keeps
 * the editor selection intact without stealing toolbar button focus.
 * Undo/redo need focus to work in Tiptap.
 */

export function markActive(editor, name)            { return editor.isActive(name); }
export function blockActive(editor, name, attrs={}) { return editor.isActive(name, attrs); }
export function inList(editor) {
  return editor.isActive('bulletList') || editor.isActive('orderedList');
}

/**
 * When Ctrl+A is used, ProseMirror sets `to` to `doc.content.size`,
 * which includes the trailing empty paragraph/node that always exists
 * at the very end of the document. Any block transform (toggleHeading,
 * toggleBulletList, etc.) touches that node and spawns a duplicate.
 *
 * The fix — used by Atlassian's editor and other PM implementations —
 * is to clamp `to` to `doc.content.size - 1` so the last empty node
 * is never inside the selection when a block command runs.
 *
 * If the selection is already within bounds (normal cursor / drag
 * selection), this is a no-op.
 */
function clampSelection(editor) {
  const { state } = editor;
  const { from, to } = state.selection;
  const max = state.doc.content.size - 1;
  if (to <= max) return; // already fine, nothing to do
  editor
    .chain()
    .setTextSelection({ from, to: max })
    .run();
}

export const commands = {
  bold:      () => (e) => e.chain().toggleBold().run(),
  italic:    () => (e) => e.chain().toggleItalic().run(),
  underline: () => (e) => e.chain().toggleUnderline().run(),

  h2: () => (e) => {
    clampSelection(e);
    return e.chain().toggleHeading({ level: 2 }).run();
  },

  h3: () => (e) => {
    clampSelection(e);
    return e.chain().toggleHeading({ level: 3 }).run();
  },

  bullet: () => (e) => {
    clampSelection(e);
    if (e.isActive('bulletList') || e.isActive('orderedList')) {
      return e.chain().liftListItem('listItem').run();
    }
    return e.chain().toggleBulletList().run();
  },

  ordered: () => (e) => {
    clampSelection(e);
    if (e.isActive('bulletList') || e.isActive('orderedList')) {
      return e.chain().liftListItem('listItem').run();
    }
    return e.chain().toggleOrderedList().run();
  },

  indent:  () => (e) => e.chain().sinkListItem('listItem').run(),
  outdent: () => (e) => e.chain().liftListItem('listItem').run(),

  link:   () => null,
  unlink: () => (e) => e.chain().unsetLink().run(),

  undo: () => (e) => e.chain().focus().undo().run(),
  redo: () => (e) => e.chain().focus().redo().run(),
};