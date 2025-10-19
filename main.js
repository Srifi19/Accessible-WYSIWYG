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
    // setup saving (Ctrl/Cmd+S and Save button)
    if (typeof setupSaving === 'function') {
        setupSaving();
    }
    // setup text export/print tools
    if (typeof setupTextTools === 'function') {
        setupTextTools();
    }
    updateToolbarActiveStates();
}

/**
 * Save editor content as an HTML file (download) and log to console
 */
function saveEditorContent(filename = 'editor-content.html') {
    const html = `<!-- Saved from Accessible WYSIWYG Editor -->\n` +
                 `<!doctype html>\n<html><head><meta charset="utf-8"><title>Saved Content</title></head><body>\n` +
                 editorContent.innerHTML +
                 '\n</body></html>';

    // Create blob and trigger download
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // Also log the current HTML to console for debugging / saving to DB
    console.log('💾 Saved editor HTML to file:', filename);
    console.log(editorContent.innerHTML);
}

/**
 * Setup global shortcuts and a Save button
 */
function setupSaving() {
    // Ctrl/Cmd+S to save
    document.addEventListener('keydown', (e) => {
        const isSave = (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey);
        if (isSave) {
            e.preventDefault();
            saveEditorContent();
        }
    });

    // Add a small save button to the toolbar area for discoverability
    try {
        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'toolbar-btn save-btn';
        saveBtn.setAttribute('aria-label', 'Save content');
        saveBtn.title = 'Save content (Ctrl+S)';
        saveBtn.textContent = 'Save';
        // Insert at end of toolbar
        toolbar.appendChild(saveBtn);
        saveBtn.addEventListener('click', () => saveEditorContent());
    } catch (err) {
        // ignore if toolbar isn't available yet
    }
}

/**
 * Return the editor plain text (safely extracting visible text)
 */
function getEditorText() {
    // Use textContent to get visible text, preserving line breaks from block elements
    // Convert some block-level elements to newlines for better plain-text formatting
    const clone = editorContent.cloneNode(true);

    // Replace <br> with newline
    clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

    // Insert newlines between block elements
    ['p','div','h1','h2','h3','h4','h5','h6','li'].forEach(tag => {
        clone.querySelectorAll(tag).forEach(el => {
            el.insertAdjacentText('afterend', '\n');
        });
    });

    // Get textContent and normalize whitespace
    let text = clone.textContent || '';
    // Collapse multiple blank lines and trim
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
}

/**
 * Export the editor plain text as a .txt file
 */
function exportEditorTextFile(filename = 'editor-content.txt') {
    const text = getEditorText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    console.log('💾 Exported editor plain text to file:', filename);
    console.log(text);
}

/**
 * Copy plain text to clipboard
 */
async function copyEditorTextToClipboard() {
    const text = getEditorText();
    try {
        await navigator.clipboard.writeText(text);
        console.log('📋 Copied editor text to clipboard');
    } catch (err) {
        // Fallback: select and execCommand('copy')
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try { document.execCommand('copy'); console.log('📋 Copied via fallback'); } catch (e) { console.warn('Copy failed', e); }
        textarea.remove();
    }
}

/**
 * Open a simple print view containing only the editor text (plain text in <pre>)
 */
function openPrintView() {
    const text = getEditorText();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Print Editor Text</title></head><body>');
    w.document.write('<pre style="white-space:pre-wrap; word-wrap:break-word; font-family:inherit;">' +
                     escapeHtml(text) + '</pre>');
    w.document.write('</body></html>');
    w.document.close();
    // Give time for content to render
    setTimeout(() => w.print(), 300);
}

/**
 * Escape HTML for safe insertion into the print view
 */
function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (s) {
        return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[s];
    });
}

/**
 * Setup text export/copy/print tools and a toolbar button
 */
function setupTextTools() {
    // Ctrl/Cmd+Shift+S -> export plain text
    document.addEventListener('keydown', (e) => {
        const isExportText = (e.key === 'S' || e.key === 's') && (e.shiftKey) && (e.ctrlKey || e.metaKey);
        if (isExportText) {
            e.preventDefault();
            exportEditorTextFile();
        }
    });

    // Add Text button to toolbar
    try {
        const textBtn = document.createElement('button');
        textBtn.type = 'button';
        textBtn.className = 'toolbar-btn text-export-btn';
        textBtn.setAttribute('aria-label', 'Export text');
        textBtn.title = 'Export as plain text (Ctrl+Shift+S)';
        textBtn.textContent = 'Text';
        toolbar.appendChild(textBtn);

        // Click cycles through actions: export -> copy -> print (for quick UI without extra buttons)
        let clickMode = 0;
        textBtn.addEventListener('click', async () => {
            if (clickMode === 0) {
                exportEditorTextFile();
            } else if (clickMode === 1) {
                await copyEditorTextToClipboard();
            } else {
                openPrintView();
            }
            clickMode = (clickMode + 1) % 3;
        });
    } catch (err) {
        // ignore if toolbar not present
    }
}

/**
 * Convert a simple HTML fragment (editor innerHTML) to Markdown
 * This is a lightweight converter that handles headings, paragraphs, links, lists, bold, italic, code, and line breaks.
 */
function htmlToMarkdown(html) {
    // Create a temporary container to walk the DOM
    const container = document.createElement('div');
    container.innerHTML = html;

    function nodeToMd(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return node.nodeValue.replace(/\s+/g, ' ');
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return '';

        const tag = node.tagName.toLowerCase();
        switch (tag) {
            case 'h1': return '# ' + inlineChildren(node) + '\n\n';
            case 'h2': return '## ' + inlineChildren(node) + '\n\n';
            case 'h3': return '### ' + inlineChildren(node) + '\n\n';
            case 'h4': return '#### ' + inlineChildren(node) + '\n\n';
            case 'p': return inlineChildren(node) + '\n\n';
            case 'br': return '\n';
            case 'strong':
            case 'b': return '**' + inlineChildren(node) + '**';
            case 'em':
            case 'i': return '*' + inlineChildren(node) + '*';
            case 'code': return '`' + inlineChildren(node) + '`';
            case 'pre': return '```\n' + node.textContent + '\n```\n\n';
            case 'a': return '[' + inlineChildren(node) + '](' + (node.getAttribute('href') || '') + ')';
            case 'ul': return Array.from(node.children).map(li => '- ' + inlineChildren(li)).join('\n') + '\n\n';
            case 'ol': return Array.from(node.children).map((li,i) => (i+1) + '. ' + inlineChildren(li)).join('\n') + '\n\n';
            case 'li': return inlineChildren(node) + '\n';
            case 'div': return inlineChildren(node) + '\n\n';
            default:
                return inlineChildren(node);
        }
    }

    function inlineChildren(el) {
        return Array.from(el.childNodes).map(nodeToMd).join('').trim();
    }

    return inlineChildren(container).replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Convert a very small subset of Markdown to HTML
 * This is minimal and intended for round-trip on the editor's output; for full Markdown support use a library like marked or markdown-it.
 */
function markdownToHtml(md) {
    // Escape HTML first
    let s = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Code blocks
    s = s.replace(/```\n([\s\S]*?)\n```/g, function(_, code) {
        return '<pre><code>' + code.replace(/</g,'&lt;') + '</code></pre>\n\n';
    });

    // Headings
    s = s.replace(/^######\s(.+)$/gm, '<h6>$1</h6>');
    s = s.replace(/^#####\s(.+)$/gm, '<h5>$1</h5>');
    s = s.replace(/^####\s(.+)$/gm, '<h4>$1</h4>');
    s = s.replace(/^###\s(.+)$/gm, '<h3>$1</h3>');
    s = s.replace(/^##\s(.+)$/gm, '<h2>$1</h2>');
    s = s.replace(/^#\s(.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Lists (very simple)
    // Ordered
    s = s.replace(/(^|\n)(?:\d+\.\s.+(?:\n|$))+/g, function(block) {
        const items = block.trim().split(/\n/).map(line => line.replace(/^\d+\.\s/, ''));
        return '<ol>' + items.map(i => '<li>' + i + '</li>').join('') + '</ol>';
    });
    // Unordered
    s = s.replace(/(^|\n)(?:-\s.+(?:\n|$))+/g, function(block) {
        const items = block.trim().split(/\n/).map(line => line.replace(/^-\s/, ''));
        return '<ul>' + items.map(i => '<li>' + i + '</li>').join('') + '</ul>';
    });

    // Paragraphs: wrap remaining lines
    s = s.split(/\n{2,}/).map(para => {
        if (/^<h|^<ul|^<ol|^<pre/.test(para.trim())) return para;
        return '<p>' + para.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    return s;
}

/**
 * Save Markdown to localStorage (simulate DB). Prompts for a key if none provided.
 */
function saveMarkdownToLocal(key) {
    const md = htmlToMarkdown(editorContent.innerHTML);
    const storageKey = key || prompt('Storage key (e.g., article-1):', 'editor-md-1');
    if (!storageKey) return;
    localStorage.setItem(storageKey, md);
    console.log('💾 Saved Markdown to localStorage key:', storageKey);
    return storageKey;
}

/**
 * Load Markdown from localStorage (simulate DB) and render into the editor
 */
function loadMarkdownFromLocal(key) {
    const storageKey = key || prompt('Storage key to load:', 'editor-md-1');
    if (!storageKey) return;
    const md = localStorage.getItem(storageKey);
    if (md === null) {
        alert('No entry found for key: ' + storageKey);
        return null;
    }
    const html = markdownToHtml(md);
    editorContent.innerHTML = html;
    updateToolbarActiveStates();
    console.log('📥 Loaded Markdown from localStorage key:', storageKey);
    return storageKey;
}

/**
 * Export Markdown file
 */
function exportMarkdownFile(filename = 'editor-content.md') {
    const md = htmlToMarkdown(editorContent.innerHTML);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    console.log('💾 Exported Markdown to file:', filename);
}

/**
 * Setup Markdown toolbar buttons
 */
function setupMarkdownTools() {
    try {
        const saveMdBtn = document.createElement('button');
        saveMdBtn.type = 'button';
        saveMdBtn.className = 'toolbar-btn save-md-btn';
        saveMdBtn.setAttribute('aria-label', 'Save as Markdown');
        saveMdBtn.title = 'Save as Markdown (to localStorage)';
        saveMdBtn.textContent = 'Save MD';
        toolbar.appendChild(saveMdBtn);
        saveMdBtn.addEventListener('click', () => saveMarkdownToLocal());

        const loadMdBtn = document.createElement('button');
        loadMdBtn.type = 'button';
        loadMdBtn.className = 'toolbar-btn load-md-btn';
        loadMdBtn.setAttribute('aria-label', 'Load Markdown');
        loadMdBtn.title = 'Load Markdown from localStorage';
        loadMdBtn.textContent = 'Load MD';
        toolbar.appendChild(loadMdBtn);
        loadMdBtn.addEventListener('click', () => loadMarkdownFromLocal());

        const exportMdBtn = document.createElement('button');
        exportMdBtn.type = 'button';
        exportMdBtn.className = 'toolbar-btn export-md-btn';
        exportMdBtn.setAttribute('aria-label', 'Export Markdown');
        exportMdBtn.title = 'Export Markdown file';
        exportMdBtn.textContent = 'Export MD';
        toolbar.appendChild(exportMdBtn);
        exportMdBtn.addEventListener('click', () => exportMarkdownFile());
    } catch (err) {
        // ignore if toolbar not present
    }
}

// Wire markdown tools up in init
if (typeof setupMarkdownTools === 'function') {
    setupMarkdownTools();
}
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
            return; // Let tab move focus out
        }

        // Update toolbar active states on formatting shortcuts
        if (e.ctrlKey || e.metaKey) {
            setTimeout(updateToolbarActiveStates, 10);
        }
    });

    // Handle paste — auto-detect and linkify URLs
    editorContent.addEventListener('paste', (e) => {
        e.preventDefault();

        const clipboard = (e.clipboardData || window.clipboardData);
        const html = clipboard.getData('text/html');
        const text = clipboard.getData('text/plain');

        if (html) {
            // If rich HTML is available (e.g., copying from a webpage), preserve it.
            // Parse to extract body fragment so we don't insert a full HTML document.
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const fragment = doc.body && doc.body.innerHTML ? doc.body.innerHTML : html;
                document.execCommand('insertHTML', false, fragment);
            } catch (err) {
                // Fallback to inserting raw HTML string
                document.execCommand('insertHTML', false, html);
            }
        } else if (isValidUrl(text)) {
            // If plain text is a URL, create a clickable link but keep the original text as link text
            const finalUrl = addProtocolIfMissing(text);
            document.execCommand('insertHTML', false, `<a href="${finalUrl}" target="_blank">${text}</a>`);
        } else {
            // Normal paste if not a URL
            document.execCommand('insertText', false, text);
        }

        // Log content after paste
        logEditorContent();
    });

    // Clear placeholder text on first input
    editorContent.addEventListener('input', function clearPlaceholder() {
        const firstP = editorContent.querySelector('p');
        if (firstP && firstP.textContent === 'Start typing here...') {
            firstP.textContent = '';
        }
    }, { once: true });

    // Log editor content live on input
    editorContent.addEventListener('input', logEditorContent);
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(text) {
    try {
        const url = new URL(addProtocolIfMissing(text));
        return true;
    } catch {
        return false;
    }
}

/**
 * Ensure URLs have https:// if missing
 */
function addProtocolIfMissing(url) {
    if (!/^https?:\/\//i.test(url)) {
        return 'https://' + url;
    }
    return url;
}

/**
 * Log the HTML content (simulate DB save)
 */
function logEditorContent() {
    const html = editorContent.innerHTML.trim();
    console.clear();
    console.log('📝 Editor HTML output (to save in DB):');
    console.log(html);
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
