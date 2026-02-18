import { getEditorView, commands, markActive, schema, blockActive } from './editor.js';
import { openLinkPopup } from './linkPopup.js';

let currentToolbarIndex = 0;
let lastCommand = null;

let toolbar = null;
let toolbarButtons = [];

// Always refresh DOM references right before using them
function initDomRefs() {
  toolbar = document.querySelector('.toolbar');
  toolbarButtons = Array.from(document.querySelectorAll('.toolbar-btn'));
}

// --- Helpers (kept private) ---
function navigateToolbar(direction, wrap = false) {
  initDomRefs(); // ensure fresh DOM

  if (toolbarButtons.length === 0) return;

  currentToolbarIndex += direction;

  if (wrap) {
    if (currentToolbarIndex < 0) {
      currentToolbarIndex = toolbarButtons.length - 1;
    } else if (currentToolbarIndex >= toolbarButtons.length) {
      currentToolbarIndex = 0;
    }
  } else {
    if (currentToolbarIndex < 0) currentToolbarIndex = 0;
    if (currentToolbarIndex >= toolbarButtons.length) {
      currentToolbarIndex = toolbarButtons.length - 1;
    }
  }

  toolbarButtons[currentToolbarIndex].focus();
  updateRovingTabindex();
}

function isButtonVisible(btn) {
  return !!(btn.offsetWidth || btn.offsetHeight || btn.getClientRects().length);
}

function updateRovingTabindex() {
  initDomRefs(); // ensure fresh DOM

  if (toolbarButtons.length === 0) return;

  // Clamp index
  if (currentToolbarIndex < 0) currentToolbarIndex = 0;
  if (currentToolbarIndex >= toolbarButtons.length) {
    currentToolbarIndex = toolbarButtons.length - 1;
  }

  // If current button is hidden, move to first visible
  if (!isButtonVisible(toolbarButtons[currentToolbarIndex])) {
    const firstVisibleIndex = toolbarButtons.findIndex(isButtonVisible);
    currentToolbarIndex = firstVisibleIndex === -1 ? 0 : firstVisibleIndex;
  }

  console.log('[toolbar] updateRovingTabindex currentToolbarIndex =', currentToolbarIndex);

  toolbarButtons.forEach((btn, i) => {
    if (!isButtonVisible(btn)) {
      btn.setAttribute('tabindex', '-1');
      return;
    }
    btn.setAttribute('tabindex', i === currentToolbarIndex ? '0' : '-1');
  });
}


// --- Public setup functions ---
export function setupToolbarNavigation() {
  initDomRefs();
  if (!toolbar || toolbarButtons.length === 0) return;

  updateRovingTabindex();

  toolbar.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        navigateToolbar(1, true);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        navigateToolbar(-1, true);
        break;
      case 'Home':
        e.preventDefault();
        currentToolbarIndex = 0;
        navigateToolbar(0);
        break;
      case 'End':
        e.preventDefault();
        currentToolbarIndex = toolbarButtons.length - 1;
        navigateToolbar(0);
        break;
    }
  });

  toolbarButtons.forEach((button, index) => {
    button.addEventListener('focus', () => {
      currentToolbarIndex = index;
      updateRovingTabindex();
      updateToolbarActiveStates();
    });
  });
}

export function setupToolbarButtons() {
  initDomRefs();
  if (toolbarButtons.length === 0) return;

  toolbarButtons.forEach((button) => {
    button.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const view = getEditorView();
      if (view) view.dom.focus();
    });

    button.addEventListener('click', (e) => {
      e.preventDefault();
      const command = button.getAttribute('data-command');
      executeCommand(command, button);
    });
  });
}

export function executeCommand(command, openerBtn = null) {
  const view = getEditorView();
  if (!view) return;

  if (commands[command]) {
    commands[command]()(view.state, view.dispatch, view);
    view.focus();
  } else if (command === 'link') {
    openLinkPopup(openerBtn || document.activeElement);
  }

  lastCommand = command;
  updateToolbarActiveStates();
}

export function repeatLastCommand() {
  if (lastCommand) executeCommand(lastCommand);
}

export function updateToolbarActiveStates() {
  initDomRefs();
  if (toolbarButtons.length === 0) return;

  const view = getEditorView();
  if (!view) return;

  const { state } = view;

  const isInList = (listType) => {
    const { $from } = state.selection;
    for (let d = $from.depth; d > 0; d--) {
      if ($from.node(d).type === listType) return true;
    }
    return false;
  };

  const commandCheckers = {
    bold: () => markActive(state, schema.marks.strong),
    italic: () => markActive(state, schema.marks.em),
    underline: () => markActive(state, schema.marks.underline),
    h2: () => blockActive(state, schema.nodes.heading, { level: 2 }),
    h3: () => blockActive(state, schema.nodes.heading, { level: 3 }),
    bullet: () => isInList(schema.nodes.bullet_list),
    ordered: () => isInList(schema.nodes.ordered_list),
    link: () => markActive(state, schema.marks.link),
    unlink: () => false
  };

  const linkIsActive = markActive(state, schema.marks.link);
  console.log('[toolbar] linkIsActive =', linkIsActive, 'currentToolbarIndex =', currentToolbarIndex);

  toolbarButtons.forEach((button, index) => {
    const command = button.getAttribute('data-command');
    const checker = commandCheckers[command];
    const isActive = checker ? checker() : false;

    if (command === 'unlink') {
      button.classList.toggle('show-unlink', linkIsActive);

      // If unlink just became hidden and it was the current button, move focus index
      if (!linkIsActive && index === currentToolbarIndex) {
        console.log('[toolbar] unlink hidden while focused → moving focus to index 0');
        currentToolbarIndex = 0;
      }
      return;
    }

    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  // Recompute tabindex after any visibility/state changes
  updateRovingTabindex();
}

