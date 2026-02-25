import { keymap } from 'prosemirror-keymap';
import {
  baseKeymap,
  chainCommands,
  exitCode,
  joinBackward,
  joinForward,
  splitBlock,
} from 'prosemirror-commands';
import { splitListItem, liftListItem } from 'prosemirror-schema-list';
import { undo, redo } from 'prosemirror-history';
import { schema } from './schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getListItem($pos) {
  for (let d = $pos.depth; d > 0; d--) {
    if ($pos.node(d).type === schema.nodes.list_item) {
      return { node: $pos.node(d), depth: d };
    }
  }
  return null;
}

function isListItemEmpty(state) {
  const { $from } = state.selection;
  const found = getListItem($from);
  if (!found) return false;
  return found.node.textContent.trim().length === 0;
}

function exitListOnEmptyItem(state, dispatch) {
  if (!isListItemEmpty(state)) return false;
  return liftListItem(schema.nodes.list_item)(state, dispatch);
}

// ---------------------------------------------------------------------------
// Exported keymap plugin
// ---------------------------------------------------------------------------

export function buildKeymap() {
  return [
    keymap({
      Enter: chainCommands(
        exitListOnEmptyItem,
        splitListItem(schema.nodes.list_item),
        exitCode,
        splitBlock
      ),

      'Shift-Enter': (state, dispatch) => {
        if (dispatch) {
          dispatch(
            state.tr
              .replaceSelectionWith(schema.nodes.hard_break.create())
              .scrollIntoView()
          );
        }
        return true;
      },

      Backspace: chainCommands(joinBackward),
      Delete: chainCommands(joinForward),
      'Mod-z': undo,
      'Mod-y': redo,
      'Shift-Mod-z': redo,
    }),
    keymap(baseKeymap),
  ];
}