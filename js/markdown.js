// markdown.js

const editorContent = document.querySelector('.editor-content');

/**
 * Setup markdown tools (placeholder for future UI features)
 */
export function setupMarkdownTools() {
  // Add any markdown-related UI or keybindings here
}

/**
 * Export the Markdown content from the editor to a .md file
 * @param {string} filename - The name of the file to be downloaded
 */
export function exportMarkdownFile(filename = 'editor-content.md') {
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
 * Save the Markdown content to local storage
 * @param {string} key - The storage key to save as
 */
export function saveMarkdownToLocal(key) {
  const md = htmlToMarkdown(editorContent.innerHTML);
  const storageKey = key || prompt('Storage key (e.g., article-1):', 'editor-md-1');
  if (!storageKey) return;
  localStorage.setItem(storageKey, md);
  console.log('💾 Saved Markdown to localStorage key:', storageKey);
  return storageKey;
}

/**
 * Load Markdown content from local storage
 * @param {string} key - The storage key to load from
 */
export function loadMarkdownFromLocal(key) {
  const storageKey = key || prompt('Storage key to load:', 'editor-md-1');
  if (!storageKey) return;
  const md = localStorage.getItem(storageKey);
  if (md === null) {
    alert('No entry found for key: ' + storageKey);
    return null;
  }
  const html = markdownToHtml(md);
  editorContent.innerHTML = html;
  console.log('📥 Loaded Markdown from localStorage key:', storageKey);
}

/**
 * Convert HTML to Markdown format
 * Handles: h1–h3, paragraphs, strong/bold, em/italic, links, lists (ul/ol)
 * @param {string} html - The HTML to be converted
 * @returns {string} - The converted Markdown
 */
export function htmlToMarkdown(html) {
  const container = document.createElement('div');
  container.innerHTML = html;

  function nodeToMarkdown(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return normalizeText(node.nodeValue);
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();

    switch (tag) {
      case 'h1': return `# ${inlineChildren(node)}\n\n`;
      case 'h2': return `## ${inlineChildren(node)}\n\n`;
      case 'h3': return `### ${inlineChildren(node)}\n\n`;
      case 'p': return `${inlineChildren(node)}\n\n`;
      case 'strong':
      case 'b': return `**${inlineChildren(node)}**`;
      case 'em':
      case 'i': return `*${inlineChildren(node)}*`;
      case 'a': {
        const href = node.getAttribute('href') || '';
        const text = inlineChildren(node) || href;
        return `[${text}](${href})`;
      }
      case 'ul': {
        const items = Array.from(node.children)
          .filter(c => c.tagName && c.tagName.toLowerCase() === 'li')
          .map(li => `- ${inlineChildren(li)}`);
        return `${items.join('\n')}\n\n`;
      }
      case 'ol': {
        const items = Array.from(node.children)
          .filter(c => c.tagName && c.tagName.toLowerCase() === 'li')
          .map((li, i) => `${i + 1}. ${inlineChildren(li)}`);
        return `${items.join('\n')}\n\n`;
      }
      case 'li': return inlineChildren(node); // handled by parent list
      case 'br': return '\n';
      case 'div': return `${blockChildren(node)}\n`;
      default:
        // Fallback: treat unknown tags as inline content
        return inlineChildren(node);
    }
  }

  function inlineChildren(el) {
    return Array.from(el.childNodes).map(nodeToMarkdown).join('').trim();
  }

  function blockChildren(el) {
    return Array.from(el.childNodes).map(nodeToMarkdown).join('').replace(/\n{3,}/g, '\n\n').trim();
  }

  function normalizeText(text) {
    return String(text).replace(/\s+/g, ' ');
  }

  const md = blockChildren(container).trim();
  return md.replace(/\n{3,}/g, '\n\n');
}

/**
 * Convert Markdown format back to HTML
 * Handles: h1–h3, bold, italic, links, images, lists (ul/ol), paragraphs
 * @param {string} markdown - The Markdown to be converted
 * @returns {string} - The converted HTML
 */
export function markdownToHtml(markdown) {
  // Normalize line endings
  const src = String(markdown).replace(/\r\n/g, '\n');

  // Split into blocks to properly wrap lists and paragraphs
  const lines = src.split('\n');

  const htmlParts = [];
  let inUl = false;
  let inOl = false;

  function closeLists() {
    if (inUl) { htmlParts.push('</ul>'); inUl = false; }
    if (inOl) { htmlParts.push('</ol>'); inOl = false; }
  }

  for (let raw of lines) {
    const line = raw.trim();

    // Headings
    if (/^#{1}\s+/.test(line)) {
      closeLists();
      htmlParts.push(`<h1>${escapeHtml(line.replace(/^#\s+/, ''))}</h1>`);
      continue;
    }
    if (/^#{2}\s+/.test(line)) {
      closeLists();
      htmlParts.push(`<h2>${escapeHtml(line.replace(/^##\s+/, ''))}</h2>`);
      continue;
    }
    if (/^#{3}\s+/.test(line)) {
      closeLists();
      htmlParts.push(`<h3>${escapeHtml(line.replace(/^###\s+/, ''))}</h3>`);
      continue;
    }

    // Unordered list item
    if (/^-\s+/.test(line)) {
      const content = line.replace(/^-\s+/, '');
      if (!inUl) { closeLists(); htmlParts.push('<ul>'); inUl = true; }
      htmlParts.push(`<li>${inlineMdToHtml(content)}</li>`);
      continue;
    }

    // Ordered list item
    if (/^\d+\.\s+/.test(line)) {
      const content = line.replace(/^\d+\.\s+/, '');
      if (!inOl) { closeLists(); htmlParts.push('<ol>'); inOl = true; }
      htmlParts.push(`<li>${inlineMdToHtml(content)}</li>`);
      continue;
    }

    // Blank line
    if (line === '') {
      closeLists();
      htmlParts.push('<br/>');
      continue;
    }

    // Paragraph
    closeLists();
    htmlParts.push(`<p>${inlineMdToHtml(line)}</p>`);
  }

  closeLists();

  return htmlParts.join('');
}


/**
 * Minimal HTML escaping for safe text insertion.
 */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return ch;
    }
  });
}
