import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import {
  addListNodes,
  wrapInList,
  liftListItem,
  sinkListItem,
  splitListItem
} from "prosemirror-schema-list";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import {
  baseKeymap,
  toggleMark,
  setBlockType,
  chainCommands,
  exitCode,
  joinBackward,
  joinForward,
  splitBlock
} from "prosemirror-commands";
import { updateToolbarActiveStates } from './toolbar.js';
import { Fragment } from "prosemirror-model";

import { TextSelection } from "prosemirror-state";

// --- Schema with list support ---
const nodes = addListNodes(basicSchema.spec.nodes, "paragraph block*", "block");

const schema = new Schema({ nodes, marks: basicSchema.spec.marks });

let view = null;

// --- Helpers ---
export function markActive(state, type) {
  const { from, $from, to, empty } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks());
  return state.doc.rangeHasMark(from, to, type);
}

export function blockActive(state, type, attrs = {}) {
  const { from, to } = state.selection;
  let active = true;
  state.doc.nodesBetween(from, to, (node) => {
    if (node.isTextblock) {
      if (!node.hasMarkup(type, attrs)) {
        active = false;
        return false; // stop traversal
      }
    }
  });
  return active;
}


function unwrapListNodeToParagraphs(listNode, state) {
  const { paragraph, list_item, bullet_list, ordered_list } = state.schema.nodes;
  const blocks = [];

  listNode.forEach(li => {
    if (li.type !== list_item) return;

    // li content is typically: [paragraph, (optional nested list...)]
    const first = li.firstChild;
    if (first && first.type === paragraph) {
      // create a paragraph that reuses the inner paragraph's content (NOT the whole LI)
      blocks.push(paragraph.create(first.attrs, first.content, first.marks));
    } else if (first) {
      // fallback: coerce first child's content into a paragraph
      blocks.push(paragraph.create(null, first.content));
    } else {
      // empty list item -> empty paragraph
      blocks.push(paragraph.create());
    }

    // If you want to preserve nested sub-lists, you can optionally push them too:
    // let idx = 0;
    // li.forEach((child, i) => {
    //   if (i === 0) return; // skip the first paragraph handled above
    //   if (child.type === bullet_list || child.type === ordered_list) {
    //     // Either flatten them recursively OR keep them as-is after the paragraph.
    //     // For "flatten", call unwrapListNodeToParagraphs(child, state) and push results.
    //     unwrapListNodeToParagraphs(child, state).forEach(p => blocks.push(p));
    //   } else {
    //     // Non-list blocks after the first paragraph: insert as paragraphs.
    //     blocks.push(paragraph.create(null, child.content, child.marks));
    //   }
    // });
  });

  return Fragment.fromArray(blocks);
}

function toggleList(listType) {
  const { list_item, paragraph, bullet_list, ordered_list } = schema.nodes;

  return (state, dispatch, view) => {
    const { selection, doc } = state;
    const { from, to, $from } = selection;

    let foundList = null;

    // 1) Detect the first list node intersecting selection
    doc.nodesBetween(from, to, (node, pos) => {
      if (node.type === bullet_list || node.type === ordered_list) {
        if (!foundList) {
          foundList = { node, pos };
        }
      }
    });

    // 2) If a whole list is fully selected → UNLIST or SWITCH TYPE
    if (foundList) {
      const { node, pos } = foundList;
      const start = pos;
      const end = pos + node.nodeSize;
      const fullySelected = from <= start && to >= end;

      if (fullySelected) {
        // Same type → replace list with paragraphs flattened from each list_item’s inner paragraph
        if (node.type === listType) {
          if (!dispatch) return true;
          const frag = unwrapListNodeToParagraphs(node, state);
          const tr = state.tr.replaceWith(start, end, frag);
          dispatch(tr.scrollIntoView());
          return true;
        }

        // Different type → switch list type in place
        if (dispatch) {
          const tr = state.tr.setNodeMarkup(pos, listType, node.attrs, node.marks);
          dispatch(tr.scrollIntoView());
        }
        return true;
      }
    }

    // 3) Caret (or range) inside a list → toggle normally
    for (let d = $from.depth; d > 0; d--) {
  const node = $from.node(d);

  if (node.type === bullet_list || node.type === ordered_list) {
    const posOfList = $from.before(d);
    const listStart = posOfList;
    const listEnd = posOfList + node.nodeSize;

    // --- CASE: same list type ---
    if (node.type === listType) {
      // If selection extends outside this list, wrap non-list blocks instead of unlisting
      const { from, to } = state.selection;
      const extendsBefore = from < listStart;
      const extendsAfter = to > listEnd;

      if (!state.selection.empty && (extendsBefore || extendsAfter)) {
        if (!dispatch) return true;

        // We'll wrap the non-list segments (before/after) into listType
        // Do it in two passes (after then before), mapping positions each time.

        let curState = state;

        // Wrap the AFTER segment: [listEnd, original to)
        if (extendsAfter) {
          const aListEnd = listEnd; // in curState
          const aTo = Math.min(curState.doc.content.size, to);
          if (aTo > aListEnd) {
            // set a temporary selection on the after segment
            let tr1 = curState.tr.setSelection(
              TextSelection.create(curState.doc, aListEnd, aTo)
            );
            dispatch(tr1);
            curState = (view && view.state) ? view.state : curState;

            // wrap that selection in a new list
            wrapInList(listType)(curState, (stepTr) => {
              dispatch(stepTr);
              curState = (view && view.state) ? view.state : curState;
            });
          }
        }

        // Wrap the BEFORE segment: [from, listStart)
        if (extendsBefore) {
          const bFrom = Math.max(1, from);
          // listStart may have shifted; re-resolve in curState
          const mappedListStart = (function() {
            // re-find the list at the same depth from $from if possible
            let $curFrom = curState.selection.$from;
            for (let dd = $curFrom.depth; dd > 0; dd--) {
              const n = $curFrom.node(dd);
              if (n.type === bullet_list || n.type === ordered_list) {
                return $curFrom.before(dd);
              }
            }
            return listStart; // fallback
          })();

          if (mappedListStart > bFrom) {
            let tr2 = curState.tr.setSelection(
              TextSelection.create(curState.doc, bFrom, mappedListStart)
            );
            dispatch(tr2);
            curState = (view && view.state) ? view.state : curState;

            wrapInList(listType)(curState, (stepTr) => {
              dispatch(stepTr);
              curState = (view && view.state) ? view.state : curState;
            });
          }
        }

        // Finally, join any adjacent lists created by the wraps
        mergeAdjacentLists(
          (view && view.state) ? view.state : curState,
          (view && view.dispatch) ? view.dispatch : dispatch
        );
        return true;
      }

      // Default single-list behavior: unlist current item(s)
      return liftListItem(list_item)(state, dispatch);
    }

    // --- CASE: different list type ---
    const pos = $from.before(d);
    if (dispatch) {
      const tr = state.tr.setNodeMarkup(pos, listType, node.attrs, node.marks);
      dispatch(tr.scrollIntoView());
    }
    return true;
  }
}

    // 4) Not in a list → wrap selection in a new list
    return wrapInList(listType)(state, dispatch);
  };
}





// --- Indent/outdent ---
function indentCommand() {
  const { list_item } = schema.nodes;
  return (state, dispatch) => sinkListItem(list_item)(state, dispatch);
}
function outdentCommand() {
  const { list_item } = schema.nodes;
  return (state, dispatch) => liftListItem(list_item)(state, dispatch);
}

function normalizeSelectionToParagraphs(state, dispatch) {
  const { from, to } = state.selection;
  const { paragraph } = state.schema.nodes;

  const changes = [];

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isTextblock && node.type !== paragraph) {
      changes.push({ pos, attrs: node.attrs, marks: node.marks });
    }
  });

  if (!changes.length) return false;

  if (dispatch) {
    let tr = state.tr;
    for (const c of changes) {
      const mapped = tr.mapping.map(c.pos);
      tr = tr.setNodeMarkup(mapped, paragraph, c.attrs, c.marks);
    }
    dispatch(tr);
  }

  return true;
}


function mergeAdjacentLists(state, dispatch) {
  const { bullet_list, ordered_list } = state.schema.nodes;

  let tr = state.tr;
  let changed = false;

  // Collect list nodes in current doc
  const lists = [];
  state.doc.descendants((node, pos) => {
    if (node.type === bullet_list || node.type === ordered_list) {
      lists.push({ node, pos });
    }
  });

  // Walk from bottom to top; map positions as we mutate
  for (let i = lists.length - 2; i >= 0; i--) {
    const aPos0 = tr.mapping.map(lists[i].pos);
    const aNode = tr.doc.nodeAt(aPos0);
    if (!aNode) continue;

    const aEnd = aPos0 + aNode.nodeSize;

    const bPos0 = tr.mapping.map(lists[i + 1].pos);
    const bNode = tr.doc.nodeAt(bPos0);
    if (!bNode) continue;

    // Only join if adjacent
    if (aEnd !== bPos0) continue;

    // Optional: normalize list type before joining (join requires compatible content)
    if (aNode.type !== bNode.type) {
      tr = tr.setNodeMarkup(bPos0, aNode.type, bNode.attrs, bNode.marks);
    }

    tr = tr.join(bPos0);
    changed = true;
  }

  if (changed && dispatch) dispatch(tr);
  return changed;
}

function mergeSelectedLists(state, dispatch) {
  const { bullet_list, ordered_list } = state.schema.nodes;

  const doc = state.doc;
  const sel = state.selection;

  const lists = [];
  doc.descendants((node, pos) => {
    if (node.type === bullet_list || node.type === ordered_list) {
      lists.push({ node, pos });
    }
  });

  let tr = state.tr;
  let changed = false;

  for (let i = lists.length - 2; i >= 0; i--) {
    const a = lists[i];
    const b = lists[i + 1];

    const adjacent = (a.pos + a.node.nodeSize === b.pos);
    if (!adjacent) continue;

    const aStart = a.pos;
    const aEnd = a.pos + a.node.nodeSize;
    const bStart = b.pos;
    const bEnd = b.pos + b.node.nodeSize;

    const touchesA = sel.to > aStart && sel.from < aEnd;
    const touchesB = sel.to > bStart && sel.from < bEnd;

    if (!touchesA || !touchesB) continue;

    tr = tr.join(b.pos);
    changed = true;
  }

  if (changed && dispatch) dispatch(tr);
  return changed;
}





function getListItem($pos) {
  for (let d = $pos.depth; d > 0; d--) {
    const node = $pos.node(d);
    if (node.type === schema.nodes.list_item) {
      return { node, depth: d };
    }
  }
  return null;
}

function isListItemEmpty(state) {
  const { $from } = state.selection;
  const found = getListItem($from);
  if (!found) return false;

  const liNode = found.node;

  // Extract text content from inside the list item
  const text = liNode.textContent.trim();
  return text.length === 0;
}


function exitListOnEmptyItem(state, dispatch) {
  console.log("Exiting empty list item");

  if (!isListItemEmpty(state)) return false;
  const { list_item } = schema.nodes;

  // Lift the empty list item out of the list
  return liftListItem(list_item)(state, dispatch);
}




// --- Commands ---
export const commands = {
  bold: () => toggleMark(schema.marks.strong),
  italic: () => toggleMark(schema.marks.em),
  underline: () => toggleMark(schema.marks.underline),

  h2: () => (state, dispatch, view) => {
  if (inList(state)) {
    // First lift out of list
    liftListItem(schema.nodes.list_item)(state, tr => {
      dispatch(tr);
      // Now apply heading on the updated state
      setBlockType(schema.nodes.heading, {level: 2})(view.state, view.dispatch);
    });
    return true;
  }

  const isActive = blockActive(state, schema.nodes.heading, {level: 2});
  return isActive
    ? setBlockType(schema.nodes.paragraph)(state, dispatch)
    : setBlockType(schema.nodes.heading, {level: 2})(state, dispatch);
},


  h3: () => (state, dispatch, view) => {
  if (inList(state)) {
    liftListItem(schema.nodes.list_item)(state, tr => {
      dispatch(tr);
      setBlockType(schema.nodes.heading, {level: 3})(view.state, view.dispatch);
    });
    return true;
  }

  const isActive = blockActive(state, schema.nodes.heading, {level: 3});
  return isActive
    ? setBlockType(schema.nodes.paragraph)(state, dispatch)
    : setBlockType(schema.nodes.heading, {level: 3})(state, dispatch);
},


 bullet: () => (state, dispatch, view) => {
  const normalized = normalizeSelectionToParagraphs(state, dispatch);

  const result = normalized
    ? toggleList(schema.nodes.bullet_list)(view.state, view.dispatch)
    : toggleList(schema.nodes.bullet_list)(state, dispatch);

mergeAdjacentLists(view.state, view.dispatch);
  return result;
},




ordered: () => (state, dispatch, view) => {
  const normalized = normalizeSelectionToParagraphs(state, dispatch);

  // Run the toggle on the correct state
  const result = normalized
    ? toggleList(schema.nodes.ordered_list)(view.state, view.dispatch)
    : toggleList(schema.nodes.ordered_list)(state, dispatch);

  // After toggling, merge only fully-selected lists
mergeAdjacentLists(view.state, view.dispatch);
  return result;
},



  indent: () => indentCommand(),
  outdent: () => outdentCommand(),
  unlink: () => (state, dispatch) => {
  const { selection, tr, doc } = state;
  const link = schema.marks.link;

  if (!dispatch) return true;

  let { from, to, empty } = selection;

  // -----------------------------
  // CASE 1: Cursor only → unlink entire link
  // -----------------------------
  if (empty) {
    const $pos = selection.$from;
    console.log("Unlinking cursor position", $pos.pos);

    // If cursor is not inside a link, do nothing
    if (!link.isInSet($pos.marks())) return false;

    // Expand left
    let start = $pos.pos;
    while (start > 0) {
      const prev = doc.resolve(start - 1);
      if (!link.isInSet(prev.marks())) break;
      start--;
    }
    if (start > 0) start --;

    // Expand right
    let end = $pos.pos;
    while (end < doc.content.size) {
      const next = doc.resolve(end);
      if (!link.isInSet(next.marks())) break;
      end++;
    }

    dispatch(tr.removeMark(start, end, link));
    return true;
  }

  // -----------------------------
  // CASE 2: Selection exists → unlink only selected part
  // -----------------------------
  dispatch(tr.removeMark(from, to, link));
  return true;
}

,
  undo: () => undo,
  redo: () => redo
};




function inList(state) {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === schema.nodes.bullet_list ||
      $from.node(d).type === schema.nodes.ordered_list) {
      return true;
    }
  }
  return false;
}


const customKeymap = keymap({
  "Enter": chainCommands(
    exitListOnEmptyItem,            
    splitListItem(schema.nodes.list_item),
    exitCode,
    splitBlock
  ),

  "Shift-Enter": (state, dispatch) => {
    if (dispatch) {
      dispatch(
        state.tr
          .replaceSelectionWith(schema.nodes.hard_break.create())
          .scrollIntoView()
      );
    }
    return true;
  },

  "Backspace": chainCommands(joinBackward),
  "Delete": chainCommands(joinForward),
  "Mod-z": undo,
  "Mod-y": redo,
  "Shift-Mod-z": redo
});


// --- Initialize editor ---
export function initEditor() {
  const state = EditorState.create({
    schema,
    plugins: [
      history(),
      // Custom first so it overrides defaults
      customKeymap,
      keymap(baseKeymap)
    ]
  });

  view = new EditorView(document.querySelector("#editor"), {
  state,
 handleDOMEvents: {
  mousedown: (view, event) => {
    // Use mousedown so we can prevent default navigation before the browser follows the link
    const a = event.target && event.target.closest && event.target.closest("a");
    if (!a) return false;

    if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+Click → open in new tab, don't move the selection
      const href = a.getAttribute("href");
      if (href) {
        event.preventDefault();
        window.open(href, "_blank");
        return true; // handled
      }
    }

    // Regular click → let ProseMirror place the caret precisely
    return false;
  }
}
  ,
  dispatchTransaction(tr) {
    const newState = view.state.apply(tr);
    view.updateState(newState);
    updateToolbarActiveStates();
  }
});


  console.log("WYSIWYG editor initialized — Enter, Tab, Shift-Tab fixed");
  return view;
}

export function getEditorView() {
  return view;
}

export { schema };
