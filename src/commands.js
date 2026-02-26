export function markActive(editor, name)            { return editor.isActive(name); }
export function blockActive(editor, name, attrs={}) { return editor.isActive(name, attrs); }
export function inList(editor) {
  return editor.isActive('bulletList') || editor.isActive('orderedList');
}

// Clamp selection before block commands to avoid Ctrl+A edge case
function clampSelection(editor) {
  const { from, to } = editor.state.selection;
  const max = editor.state.doc.content.size - 1;
  if (to > max) {
    editor.chain().setTextSelection({ from, to: max }).run();
  }
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