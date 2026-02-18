// init.js
import { initEditor } from './editor.js';
import { setupToolbarNavigation, setupToolbarButtons } from './toolbar.js';
import { setupLinkPopup } from './linkPopup.js';
import { setupMarkdownTools } from './markdown.js';
import { setupSaving } from './saving.js';

let initialized = false;

function safeInit(fn, name) {
  try {
    fn();
    console.log(`✅ ${name} initialized`);
  } catch (err) {
    console.warn(`⚠️ Failed to initialize ${name}:`, err);
  }
}

/**
 * Initialize the ProseMirror editor and supporting modules
 */
function initialize() {
  if (initialized) return;
  initialized = true;

  console.log('Initializing Accessible WYSIWYG Editor...');
  // Order matters: editor first, then toolbar and extras
  safeInit(initEditor, 'Editor');
  safeInit(setupToolbarNavigation, 'Toolbar Navigation');
  safeInit(setupToolbarButtons, 'Toolbar Buttons');
  safeInit(setupLinkPopup, 'Link Popup');
  safeInit(setupMarkdownTools, 'Markdown Tools');
  safeInit(setupSaving, 'Saving');
}

// Ensure DOM is ready before initializing
document.addEventListener('DOMContentLoaded', initialize);

export { initialize };
