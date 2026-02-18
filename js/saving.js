/**
 * Setup saving functionality, including keyboard shortcuts and save button actions
 */
export function setupSaving() {
  document.addEventListener('keydown', (e) => {
    const isSave = (e.key === 's' || e.key === 'S') && (e.ctrlKey || e.metaKey);
    if (isSave) {
      e.preventDefault();
      saveEditorContent();
    }
  });

  const saveButton = document.querySelector('.save-button');
  if (saveButton) {
    saveButton.addEventListener('click', saveEditorContent);
  }
}

/**
 * Convert editor HTML to Markdown (basic implementation)
 */
function htmlToMarkdown(root) {
  let md = '';

  root.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Only add non‑whitespace text
      if (node.textContent.trim() !== '') {
        md += node.textContent;
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      const inner = htmlToMarkdown(node).trim(); // recurse and trim

      // If inner is empty, skip this element entirely
      if (!inner) return;

      switch (tag) {
        case 'h1':
          md += '# ' + inner + '\n\n';
          break;
        case 'h2':
          md += '## ' + inner + '\n\n';
          break;
        case 'h3':
          md += '### ' + inner + '\n\n';
          break;
        case 'p':
          md += inner + '\n\n';
          break;
        case 'strong':
        case 'b':
          md += '**' + inner + '**';
          break;
        case 'em':
        case 'i':
          md += '*' + inner + '*';
          break;
        case 'u':
          md += '__' + inner + '__';
          break;
        case 'a':
          const href = node.getAttribute('href') || '';
          md += `[${inner}](${href})`;
          break;
        case 'ul':
          node.childNodes.forEach(li => {
            if (li.tagName && li.tagName.toLowerCase() === 'li') {
              const liContent = htmlToMarkdown(li).trim();
              if (liContent) {
                md += '- ' + liContent + '\n';
              }
            }
          });
          md += '\n';
          break;
        case 'ol':
          let i = 1;
          node.childNodes.forEach(li => {
            if (li.tagName && li.tagName.toLowerCase() === 'li') {
              const liContent = htmlToMarkdown(li).trim();
              if (liContent) {
                md += i + '. ' + liContent + '\n';
                i++;
              }
            }
          });
          md += '\n';
          break;
        case 'li':
          md += inner;
          break;
        case 'br':
          md += '  \n';
          break;
        default:
          md += inner;
      }
    }
  });

  return md;
}


/**
 * Save the editor content as a Markdown file
 */
export function saveEditorContent(filename = 'editor-content.md') {
  const editorContent = document.querySelector('.editor-content');
  const markdown = htmlToMarkdown(editorContent).trim() + '\n';

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  console.log('💾 Saved editor Markdown to file:', filename);
  console.log(markdown);
}
