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

  // Clean structural heading toggle
  h2: () => (e) =>
    e.chain()
      .focus()
      .liftListItem('listItem')  // harmless if not in list
      .toggleHeading({ level: 2 })
      .run(),

  h3: () => (e) =>
    e.chain()
      .focus()
      .liftListItem('listItem')
      .toggleHeading({ level: 3 })
      .run(),

  // Clean list toggles
  bullet: () => (e) =>
    e.chain()
      .focus()
      .toggleBulletList()
      .run(),

  ordered: () => (e) =>
    e.chain()
      .focus()
      .toggleOrderedList()
      .run(),

  indent:  () => (e) => e.chain().focus().sinkListItem('listItem').run(),
  outdent: () => (e) => e.chain().focus().liftListItem('listItem').run(),

  link:   () => null,
  unlink: () => (e) => e.chain().focus().unsetLink().run(),

  undo: () => (e) => e.chain().focus().undo().run(),
  redo: () => (e) => e.chain().focus().redo().run(),
};