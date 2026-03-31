export function markActive(editor, name)            { return editor.isActive(name); }
export function blockActive(editor, name, attrs={}) { return editor.isActive(name, attrs); }
export function inList(editor) {
  return editor.isActive('bulletList') || editor.isActive('orderedList');
}

function clampSelection(editor) {
  const { from, to } = editor.state.selection;
  const max = editor.state.doc.content.size - 1;
  if (to > max) {
    editor.chain().setTextSelection({ from, to: max }).run();
  }
}

function getActiveMarks(editor) {
  return {
    bold:      editor.isActive('bold'),
    italic:    editor.isActive('italic'),
    underline: editor.isActive('underline'),
  };
}

function reapplyMarks(editor, marks, from, to) {
  if (!marks.bold && !marks.italic && !marks.underline) return;
  
  if (editor.isActive('heading')) return;

  let chain = editor.chain().setTextSelection({ from, to });
  if (marks.bold)      chain = chain.setMark('bold');
  if (marks.italic)    chain = chain.setMark('italic');
  if (marks.underline) chain = chain.setMark('underline');
  chain.run();
}

function withMarksPreserved(listFn) {
  return (e) => {
    const marks        = getActiveMarks(e);
    const { from, to } = e.state.selection;
    clampSelection(e);
    listFn(e);
    reapplyMarks(e, marks, from, to);
  };
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

  bullet: () => withMarksPreserved((e) => {
    if (e.isActive('bulletList')) {
      return e.chain().liftListItem('listItem').run();
    }
    return e.chain().toggleBulletList().run();
  }),

  ordered: () => withMarksPreserved((e) => {
    if (e.isActive('orderedList')) {
      return e.chain().liftListItem('listItem').run();
    }
    return e.chain().toggleOrderedList().run();
  }),

  // indent:  () => (e) => e.chain().sinkListItem('listItem').run(),
  // outdent: () => (e) => e.chain().liftListItem('listItem').run(),

  link:   () => null,
  unlink: () => (e) => e.chain().unsetLink().run(),

  undo: () => (e) => e.chain().focus().undo().run(),
  redo: () => (e) => e.chain().focus().redo().run(),
};