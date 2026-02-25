import { Fragment, Schema } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';
import {
  toggleMark,
  setBlockType,
  chainCommands,
} from 'prosemirror-commands';
import {
  wrapInList,
  liftListItem,
  sinkListItem,
} from 'prosemirror-schema-list';
import { undo, redo } from 'prosemirror-history';
import { schema } from './schema.js';

// ---------------------------------------------------------------------------
// State query helpers
// ---------------------------------------------------------------------------

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
        return false;
      }
    }
  });
  return active;
}

export function inList(state) {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const t = $from.node(d).type;
    if (t === schema.nodes.bullet_list || t === schema.nodes.ordered_list) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Internal list helpers
// ---------------------------------------------------------------------------

function unwrapListNodeToParagraphs(listNode, state) {
  const { paragraph, list_item } = state.schema.nodes;
  const blocks = [];

  listNode.forEach((li) => {
    if (li.type !== list_item) return;
    const first = li.firstChild;
    if (first && first.type === paragraph) {
      blocks.push(paragraph.create(first.attrs, first.content, first.marks));
    } else if (first) {
      blocks.push(paragraph.create(null, first.content));
    } else {
      blocks.push(paragraph.create());
    }
  });

  return Fragment.fromArray(blocks);
}

function mergeAdjacentLists(state, dispatch) {
  const { bullet_list, ordered_list } = state.schema.nodes;
  let tr = state.tr;
  let changed = false;

  const lists = [];
  state.doc.descendants((node, pos) => {
    if (node.type === bullet_list || node.type === ordered_list) {
      lists.push({ node, pos });
    }
  });

  for (let i = lists.length - 2; i >= 0; i--) {
    const aPos = tr.mapping.map(lists[i].pos);
    const aNode = tr.doc.nodeAt(aPos);
    if (!aNode) continue;

    const aEnd = aPos + aNode.nodeSize;
    const bPos = tr.mapping.map(lists[i + 1].pos);
    const bNode = tr.doc.nodeAt(bPos);
    if (!bNode) continue;

    if (aEnd !== bPos) continue;

    if (aNode.type !== bNode.type) {
      tr = tr.setNodeMarkup(bPos, aNode.type, bNode.attrs, bNode.marks);
    }

    tr = tr.join(bPos);
    changed = true;
  }

  if (changed && dispatch) dispatch(tr);
  return changed;
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
      tr = tr.setNodeMarkup(tr.mapping.map(c.pos), paragraph, c.attrs, c.marks);
    }
    dispatch(tr);
  }

  return true;
}

function toggleList(listType) {
  const { list_item, bullet_list, ordered_list } = schema.nodes;

  return (state, dispatch, view) => {
    const { selection, doc } = state;
    const { from, to, $from } = selection;

    // 1) Find any list node intersecting the selection
    let foundList = null;
    doc.nodesBetween(from, to, (node, pos) => {
      if (!foundList && (node.type === bullet_list || node.type === ordered_list)) {
        foundList = { node, pos };
      }
    });

    // 2) Fully-selected list → unlist or switch type
    if (foundList) {
      const { node, pos } = foundList;
      const start = pos;
      const end = pos + node.nodeSize;

      if (from <= start && to >= end) {
        if (node.type === listType) {
          if (!dispatch) return true;
          const frag = unwrapListNodeToParagraphs(node, state);
          dispatch(state.tr.replaceWith(start, end, frag).scrollIntoView());
          return true;
        }
        if (dispatch) {
          dispatch(state.tr.setNodeMarkup(pos, listType, node.attrs, node.marks).scrollIntoView());
        }
        return true;
      }
    }

    // 3) Caret/range inside an existing list
    for (let d = $from.depth; d > 0; d--) {
      const node = $from.node(d);
      if (node.type !== bullet_list && node.type !== ordered_list) continue;

      const posOfList = $from.before(d);
      const listStart = posOfList;
      const listEnd = posOfList + node.nodeSize;

      if (node.type === listType) {
        const extendsBefore = from < listStart;
        const extendsAfter = to > listEnd;

        if (!state.selection.empty && (extendsBefore || extendsAfter)) {
          if (!dispatch) return true;
          let curState = state;

          if (extendsAfter) {
            const aTo = Math.min(curState.doc.content.size, to);
            if (aTo > listEnd) {
              let tr1 = curState.tr.setSelection(TextSelection.create(curState.doc, listEnd, aTo));
              dispatch(tr1);
              curState = view?.state ?? curState;
              wrapInList(listType)(curState, (stepTr) => {
                dispatch(stepTr);
                curState = view?.state ?? curState;
              });
            }
          }

          if (extendsBefore) {
            const bFrom = Math.max(1, from);
            let mappedListStart = listStart;
            const $cur = curState.selection.$from;
            for (let dd = $cur.depth; dd > 0; dd--) {
              const n = $cur.node(dd);
              if (n.type === bullet_list || n.type === ordered_list) {
                mappedListStart = $cur.before(dd);
                break;
              }
            }
            if (mappedListStart > bFrom) {
              let tr2 = curState.tr.setSelection(TextSelection.create(curState.doc, bFrom, mappedListStart));
              dispatch(tr2);
              curState = view?.state ?? curState;
              wrapInList(listType)(curState, (stepTr) => {
                dispatch(stepTr);
                curState = view?.state ?? curState;
              });
            }
          }

          mergeAdjacentLists(view?.state ?? curState, view?.dispatch ?? dispatch);
          return true;
        }

        return liftListItem(list_item)(state, dispatch);
      }

      // Different list type → switch in place
      if (dispatch) {
        dispatch(state.tr.setNodeMarkup(posOfList, listType, node.attrs, node.marks).scrollIntoView());
      }
      return true;
    }

    // 4) Not in a list → wrap
    return wrapInList(listType)(state, dispatch);
  };
}

// ---------------------------------------------------------------------------
// Public command map
// Each value is a factory () => ProseMirrorCommand so callers can do:
//   commands.bold()(state, dispatch, view)
// ---------------------------------------------------------------------------

export const commands = {
  bold: () => toggleMark(schema.marks.strong),
  italic: () => toggleMark(schema.marks.em),
  underline: () => toggleMark(schema.marks.underline),

  h2: () => (state, dispatch, view) => {
    if (inList(state)) {
      liftListItem(schema.nodes.list_item)(state, (tr) => {
        dispatch(tr);
        setBlockType(schema.nodes.heading, { level: 2 })(view.state, view.dispatch);
      });
      return true;
    }
    const isActive = blockActive(state, schema.nodes.heading, { level: 2 });
    return isActive
      ? setBlockType(schema.nodes.paragraph)(state, dispatch)
      : setBlockType(schema.nodes.heading, { level: 2 })(state, dispatch);
  },

  h3: () => (state, dispatch, view) => {
    if (inList(state)) {
      liftListItem(schema.nodes.list_item)(state, (tr) => {
        dispatch(tr);
        setBlockType(schema.nodes.heading, { level: 3 })(view.state, view.dispatch);
      });
      return true;
    }
    const isActive = blockActive(state, schema.nodes.heading, { level: 3 });
    return isActive
      ? setBlockType(schema.nodes.paragraph)(state, dispatch)
      : setBlockType(schema.nodes.heading, { level: 3 })(state, dispatch);
  },

  bullet: () => (state, dispatch, view) => {
    const normalized = normalizeSelectionToParagraphs(state, dispatch);
    const result = normalized
      ? toggleList(schema.nodes.bullet_list)(view.state, view.dispatch, view)
      : toggleList(schema.nodes.bullet_list)(state, dispatch, view);
    mergeAdjacentLists(view.state, view.dispatch);
    return result;
  },

  ordered: () => (state, dispatch, view) => {
    const normalized = normalizeSelectionToParagraphs(state, dispatch);
    const result = normalized
      ? toggleList(schema.nodes.ordered_list)(view.state, view.dispatch, view)
      : toggleList(schema.nodes.ordered_list)(state, dispatch, view);
    mergeAdjacentLists(view.state, view.dispatch);
    return result;
  },

  indent: () => (state, dispatch) => sinkListItem(schema.nodes.list_item)(state, dispatch),
  outdent: () => (state, dispatch) => liftListItem(schema.nodes.list_item)(state, dispatch),

  unlink: () => (state, dispatch) => {
    const link = schema.marks.link;
    const { selection, tr, doc } = state;
    const { from, to, empty } = selection;

    if (!dispatch) return true;

    if (empty) {
      const $pos = selection.$from;
      if (!link.isInSet($pos.marks())) return false;

      let start = $pos.pos;
      while (start > 0 && link.isInSet(doc.resolve(start - 1).marks())) start--;
      if (start > 0) start--;

      let end = $pos.pos;
      while (end < doc.content.size && link.isInSet(doc.resolve(end).marks())) end++;

      dispatch(tr.removeMark(start, end, link));
      return true;
    }

    dispatch(tr.removeMark(from, to, link));
    return true;
  },

  undo: () => undo,
  redo: () => redo,
};