import { Editor, Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { TextSelection } from '@tiptap/pm/state';

// ─────────────────────────────────────────────────────────────────────────────
// NormalizeBeforeList
//
// Before toggling a list, converts all non-paragraph textblocks in the
// selection (headings, etc.) to paragraphs via setNodeMarkup on the same
// transaction — does NOT use clearNodes() which drops selection on Ctrl+A.
//
// Also skips empty trailing-break nodes at the END of the selection so
// Ctrl+A followed by a list command doesn't try to wrap a ghost empty node.
// ─────────────────────────────────────────────────────────────────────────────

const NormalizeBeforeList = Extension.create({
  name: 'normalizeBeforeList',

  addCommands() {
    const makeToggle = (builtinCmd) => () => ({ state, tr, dispatch, chain }) => {
      const { from, to } = state.selection;
      const paragraph    = state.schema.nodes.paragraph;

      // Collect non-paragraph textblocks, but EXCLUDE any that:
      //   - are empty (only trailing break / no text)
      //   - start at or after the last non-empty position in the selection
      // This handles Ctrl+A where the last selected node is an empty paragraph/heading.
      const toNormalize = [];
      state.doc.nodesBetween(from, to, (node, pos) => {
        if (!node.isTextblock) return;
        if (node.type === paragraph) return; // already correct type

        // Skip if this node's range is entirely beyond the last real content
        const nodeEnd = pos + node.nodeSize;
        if (pos >= to) return; // fully outside selection

        toNormalize.push(pos);
      });

      if (!toNormalize.length) {
        return chain()[builtinCmd]().run();
      }

      if (dispatch) {
        toNormalize.forEach((pos) => {
          const mapped = tr.mapping.map(pos);
          const node   = tr.doc.nodeAt(mapped);
          if (node && node.isTextblock && node.type !== paragraph) {
            tr.setNodeMarkup(mapped, paragraph);
          }
        });
        dispatch(tr);
      }

      return chain()[builtinCmd]().run();
    };

    return {
      safeToggleBulletList:  makeToggle('toggleBulletList'),
      safeToggleOrderedList: makeToggle('toggleOrderedList'),
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// NormalizeBeforeHeading
//
// Before toggling a heading, lifts any list nodes in the selection to
// paragraphs via setNodeMarkup, then delegates to toggleHeading.
//
// The key fix for Ctrl+A: we detect the trailing empty paragraph/heading
// at the end of the doc (which Tiptap always keeps) and exclude it from
// the heading operation so it stays as an empty paragraph, not a heading.
// ─────────────────────────────────────────────────────────────────────────────

const NormalizeBeforeHeading = Extension.create({
  name: 'normalizeBeforeHeading',

  addCommands() {
    return {
      safeToggleHeading: (attrs) => ({ state, tr, dispatch, chain, editor }) => {
        const { from, to }   = state.selection;
        const paragraph      = state.schema.nodes.paragraph;
        const bulletList     = state.schema.nodes.bulletList;
        const orderedList    = state.schema.nodes.orderedList;

        // Detect if selection has lists
        let hasLists = false;
        state.doc.nodesBetween(from, to, (node) => {
          if (node.type === bulletList || node.type === orderedList) {
            hasLists = true; return false;
          }
        });

        // Find the last actual content position — used to exclude the
        // trailing empty paragraph that Tiptap always appends to the doc.
        // When Ctrl+A selects everything, `to` lands on that empty node.
        const lastContentPos = (() => {
          let last = from;
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isTextblock && node.textContent !== '') {
              last = pos;
            }
          });
          return last;
        })();

        if (!hasLists) {
          // No lists — toggle heading, but only on nodes up to lastContentPos
          // to avoid turning the trailing empty paragraph into a heading.
          if (dispatch) {
            const toChange = [];
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (!node.isTextblock) return;
              // Skip trailing empty node
              if (node.textContent === '' && pos > lastContentPos) return;
              toChange.push({ pos, node });
            });

            const targetType = state.schema.nodes.heading;
            const isAllHeading = toChange.every(
              ({ node }) => node.type === targetType && node.attrs.level === attrs.level
            );

            toChange.forEach(({ pos, node: n }) => {
              const mapped = tr.mapping.map(pos);
              if (isAllHeading) {
                // Toggle off → paragraph
                tr.setNodeMarkup(mapped, paragraph);
              } else {
                // Toggle on → heading
                tr.setNodeMarkup(mapped, targetType, attrs);
              }
            });

            dispatch(tr);
          }
          return true;
        }

        // Has lists → flatten list textblocks to paragraphs, then apply heading
        if (dispatch) {
          const toFlatten = [];
          state.doc.nodesBetween(from, to, (node, pos) => {
            if (node.isTextblock && node.type !== paragraph) {
              // Skip trailing empty node
              if (node.textContent === '' && pos > lastContentPos) return;
              toFlatten.push(pos);
            }
          });

          toFlatten.forEach((pos) => {
            const mapped = tr.mapping.map(pos);
            tr.setNodeMarkup(mapped, paragraph);
          });

          dispatch(tr);
        }

        return chain().toggleHeading(attrs).run();
      },
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// EditorCore
// ─────────────────────────────────────────────────────────────────────────────

export class EditorCore {
  constructor({ mount, initialContent = '', onTransaction } = {}) {
    if (!mount) throw new Error('EditorCore: `mount` element is required');

    this._onTransaction = onTransaction;

    // Give the editor a stable ID for aria-controls on the toolbar
    this._editorId = 'wysiwyg-editor-' + Math.random().toString(36).slice(2, 7);
    mount.id = this._editorId;

    this._editor = new Editor({
      element: mount,

      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),

        Link.configure({
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer' },
        }),

        NormalizeBeforeList,
        NormalizeBeforeHeading,
      ],

      content: initialContent || '<p></p>',

      editorProps: {
        attributes: {
          role:               'textbox',
          'aria-multiline':   'true',
          'aria-label':       'Text editor',
          'aria-describedby': 'wysiwyg-editor-hint',
        },

        handleClick(view, pos, event) {
          if (event.ctrlKey || event.metaKey) {
            const $pos     = view.state.doc.resolve(pos);
            const linkMark = $pos.marks().find((m) => m.type.name === 'link');
            if (linkMark?.attrs.href) {
              window.open(linkMark.attrs.href, '_blank', 'noopener,noreferrer');
              return true;
            }
          }
          return false;
        },
      },

      onTransaction: () => {
        this._onTransaction?.();
      },
    });

    this._injectHint(mount);
  }

  _injectHint(mount) {
    if (document.getElementById('wysiwyg-editor-hint')) return;
    const hint = document.createElement('span');
    hint.id          = 'wysiwyg-editor-hint';
    hint.className   = 'wysiwyg-visually-hidden';
    hint.textContent = 'Rich text editor. Use the toolbar above to format text.';
    mount.parentElement?.insertBefore(hint, mount);
  }

  get editorId() { return this._editorId; }
  get editor()   { return this._editor; }
  get view()     { return this._editor.view; }
  get state()    { return this._editor.state; }

  getHTML()         { return this._editor.getHTML(); }
  getJSON()         { return this._editor.getJSON(); }
  setContent(html)  { this._editor.commands.setContent(html, true); }
  focus()           { this._editor.commands.focus(); }
  destroy()         { this._editor?.destroy(); }
}