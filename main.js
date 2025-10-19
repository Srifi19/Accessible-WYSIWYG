/**
 * Fully Accessible WYSIWYG Editor
 * Pure vanilla JavaScript implementation with complete keyboard navigation
 */

// Global state
let currentToolbarIndex = 0;
let savedSelection = null;

// Get DOM elements
const toolbar = document.querySelector('.toolbar');
const toolbarButtons = Array.from(document.querySelectorAll('.toolbar-btn'));
const editorContent = document.querySelector('.editor-content');
const linkPopup = document.querySelector('.link-popup');
const linkUrlInput = document.getElementById('link-url-input');
const linkApplyBtn = document.querySelector('.link-popup-apply');
const linkCancelBtn = document.querySelector('.link-popup-cancel');

/**
 * Initialize the editor
 */
function initEditor() {
    setupToolbarNavigation();
    setupToolbarButtons();
    setupEditorContent();
    setupLinkPopup();
    updateToolbarActiveStates();
}

/**
 * Setup keyboard navigation for toolbar
 */
function setupToolbarNavigation() {
    toolbar.addEventListener('keydown', (e) => {
        switch(e.key) {
            case 'ArrowRight':
                e.preventDefault();
                navigateToolbar(1);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                navigateToolbar(-1);
                break;
            case 'Tab':
                // Allow Tab to move to editor (default behavior)
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                toolbarButtons[currentToolbarIndex].click();
                break;
        }
    });

    toolbar.addEventListener('focus', () => {
        // Highlight first button when toolbar gets focus
        focusToolbarButton(currentToolbarIndex);
    });

    toolbar.addEventListener('blur', () => {
        // Remove highlight when toolbar loses focus
        toolbarButtons.forEach(btn => btn.blur());
    });
}

/**
 * Navigate between toolbar buttons
 */
function navigateToolbar(direction) {
    currentToolbarIndex += direction;
    
    // Wrap around
    if (currentToolbarIndex < 0) {
        currentToolbarIndex = toolbarButtons.length - 1;
    } else if (currentToolbarIndex >= toolbarButtons.length) {
        currentToolbarIndex = 0;
    }
    
    focusToolbarButton(currentToolbarIndex);
}

/**
 * Focus a specific toolbar button
 */
function focusToolbarButton(index) {
    toolbarButtons.forEach((btn, i) => {
        if (i === index) {
            btn.focus();
        }
    });
}

/**
 * Setup click handlers for toolbar buttons
 */
function setupToolbarButtons() {
    toolbarButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const command = button.getAttribute('data-command');
            executeCommand(command);
            editorContent.focus();
            updateToolbarActiveStates();
        });
    });
}

/**
 * Execute formatting command
 */
function executeCommand(command) {
    switch(command) {
        case 'h2':
            toggleHeading('h2');
            break;
        case 'h3':
            toggleHeading('h3');
            break;
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'insertUnorderedList':
            document.execCommand('insertUnorderedList', false, null);
            break;
        case 'insertOrderedList':
            document.execCommand('insertOrderedList', false, null);
            break;
        case 'indent':
            document.execCommand('indent', false, null);
            break;
        case 'outdent':
            document.execCommand('outdent', false, null);
            break;
        case 'createLink':
            openLinkPopup();
            break;
    }
}

/**
 * Toggle heading between H2, H3, and paragraph
 */
function toggleHeading(tag) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    let element = range.startContainer;
    
    // Find the block element
    while (element && element !== editorContent) {
        if (element.nodeType === Node.ELEMENT_NODE && 
            ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV'].includes(element.tagName)) {
            break;
        }
        element = element.parentNode;
    }
    
    if (!element || element === editorContent) {
        // Wrap selection in tag
        document.execCommand('formatBlock', false, tag);
    } else if (element.tagName.toLowerCase() === tag) {
        // Toggle back to paragraph
        document.execCommand('formatBlock', false, 'p');
    } else {
        // Change to new heading
        document.execCommand('formatBlock', false, tag);
    }
}

/**
 * Setup editor content area
 */
function setupEditorContent() {
    // Update toolbar active states on selection change
    editorContent.addEventListener('mouseup', updateToolbarActiveStates);
    editorContent.addEventListener('keyup', updateToolbarActiveStates);
    editorContent.addEventListener('focus', updateToolbarActiveStates);
    
    // Handle Tab key to move focus out
    editorContent.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            // Allow default Tab behavior (move focus out)
            return;
        }
        
        // Update active states on formatting shortcuts
        if (e.ctrlKey || e.metaKey) {
            setTimeout(updateToolbarActiveStates, 10);
        }
    });
    
    // Clear placeholder text on first input
    editorContent.addEventListener('input', function clearPlaceholder() {
        const firstP = editorContent.querySelector('p');
        if (firstP && firstP.textContent === 'Start typing here...') {
            firstP.textContent = '';
        }
        editorContent.removeEventListener('input', clearPlaceholder);
    }, { once: true });
}

/**
 * Update toolbar button active states based on current selection
 */
function updateToolbarActiveStates() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    // Check each formatting type
    toolbarButtons.forEach(button => {
        const command = button.getAttribute('data-command');
        let isActive = false;
        
        switch(command) {
            case 'bold':
                isActive = document.queryCommandState('bold');
                break;
            case 'italic':
                isActive = document.queryCommandState('italic');
                break;
            case 'underline':
                isActive = document.queryCommandState('underline');
                break;
            case 'insertUnorderedList':
                isActive = document.queryCommandState('insertUnorderedList');
                break;
            case 'insertOrderedList':
                isActive = document.queryCommandState('insertOrderedList');
                break;
            case 'h2':
                isActive = isHeadingActive('h2');
                break;
            case 'h3':
                isActive = isHeadingActive('h3');
                break;
        }
        
        if (isActive) {
            button.classList.add('active');
            button.setAttribute('aria-pressed', 'true');
        } else {
            button.classList.remove('active');
            button.setAttribute('aria-pressed', 'false');
        }
    });
}

/**
 * Check if a heading level is active
 */
function isHeadingActive(tag) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    
    let element = selection.anchorNode;
    while (element && element !== editorContent) {
        if (element.nodeType === Node.ELEMENT_NODE && 
            element.tagName.toLowerCase() === tag) {
            return true;
        }
        element = element.parentNode;
    }
    return false;
}

/**
 * Save current selection
 */
function saveSelection() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        savedSelection = selection.getRangeAt(0);
    }
}

/**
 * Restore saved selection
 */
function restoreSelection() {
    const selection = window.getSelection();
    if (savedSelection) {
        selection.removeAllRanges();
        selection.addRange(savedSelection);
    }
}

/**
 * Open link popup modal
 */
function openLinkPopup() {
    saveSelection();
    linkPopup.removeAttribute('hidden');
    linkUrlInput.value = '';
    linkUrlInput.focus();
}

/**
 * Close link popup modal
 */
function closeLinkPopup() {
    linkPopup.setAttribute('hidden', '');
    editorContent.focus();
}

/**
 * Setup link popup handlers
 */
function setupLinkPopup() {
    // Apply button
    linkApplyBtn.addEventListener('click', () => {
        applyLink();
    });
    
    // Cancel button
    linkCancelBtn.addEventListener('click', () => {
        closeLinkPopup();
    });
    
    // Enter key to apply
    linkUrlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyLink();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeLinkPopup();
        }
    });
    
    // Click outside to close
    linkPopup.addEventListener('click', (e) => {
        if (e.target === linkPopup) {
            closeLinkPopup();
        }
    });
}

/**
 * Apply link to selected text
 */
function applyLink() {
    const url = linkUrlInput.value.trim();
    
    if (!url) {
        linkUrlInput.focus();
        return;
    }
    
    // Ensure URL has protocol
    let finalUrl = url;
    if (!/^https?:\/\//i.test(url)) {
        finalUrl = 'https://' + url;
    }
    
    restoreSelection();
    
    // Get selected text
    const selection = window.getSelection();
    const selectedText = selection.toString();
    
    if (selectedText) {
        // Create link with selected text
        document.execCommand('createLink', false, finalUrl);
    } else {
        // Insert link with URL as text
        document.execCommand('insertHTML', false, `<a href="${finalUrl}">${finalUrl}</a>`);
    }
    
    closeLinkPopup();
    updateToolbarActiveStates();
}


document.addEventListener("DOMContentLoaded", () => {
    const toolbar = document.querySelector(".toolbar");
    const buttons = Array.from(toolbar.querySelectorAll(".toolbar-btn"));

    // Remove buttons from tab order
    buttons.forEach(btn => btn.setAttribute("tabindex", "-1"));

    let currentIndex = 0;

    // Enter toolbar with a single focusable element
    toolbar.setAttribute("tabindex", "0");

    toolbar.addEventListener("focus", () => {
        // When toolbar itself is focused, highlight first button
        buttons[currentIndex].focus();
    });

    toolbar.addEventListener("keydown", (e) => {
        switch(e.key) {
            case "ArrowRight":
                e.preventDefault();
                currentIndex = (currentIndex + 1) % buttons.length;
                buttons[currentIndex].focus();
                break;
            case "ArrowLeft":
                e.preventDefault();
                currentIndex = (currentIndex - 1 + buttons.length) % buttons.length;
                buttons[currentIndex].focus();
                break;
            case "Tab":
                // Prevent tabbing inside toolbar, let it exit normally
                e.preventDefault();
                // Focus next focusable element after toolbar (e.g., editor)
                const editor = document.querySelector(".editor-content");
                editor.focus();
                break;
        }
    });

    // Track focus via click or arrow key
    buttons.forEach((btn, i) => {
        btn.addEventListener("focus", () => {
            currentIndex = i;
        });
    });
});



/**
 * Initialize on DOM ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditor);
} else {
    initEditor();
}
