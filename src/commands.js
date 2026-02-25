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

export const commands = {
  bold:      () => (e) => e.chain().toggleBold().run(),
  italic:    () => (e) => e.chain().toggleItalic().run(),
  underline: () => (e) => e.chain().toggleUnderline().run(),

  // safeToggleHeading: lifts list items first, then applies heading
  h2: () => (e) => e.chain().safeToggleHeading({ level: 2 }).run(),
  h3: () => (e) => e.chain().safeToggleHeading({ level: 3 }).run(),

  // safeToggle: normalizes headings to paragraphs first, then wraps in list
  bullet:  () => (e) => e.chain().safeToggleBulletList().run(),
  ordered: () => (e) => e.chain().safeToggleOrderedList().run(),

  indent:  () => (e) => e.chain().sinkListItem('listItem').run(),
  outdent: () => (e) => e.chain().liftListItem('listItem').run(),

  link:   () => null,
  unlink: () => (e) => e.chain().unsetLink().run(),

  undo: () => (e) => e.chain().focus().undo().run(),
  redo: () => (e) => e.chain().focus().redo().run(),
};