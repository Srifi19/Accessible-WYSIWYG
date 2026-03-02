// Full Markdown support using markdown-it + prosemirror-markdown

import markdownit from 'markdown-it'
import { MarkdownParser, MarkdownSerializer } from 'prosemirror-markdown'

const md = markdownit({
  html: true,
  breaks: false,
  linkify: true,
})

export function createMarkdownParser(schema) {
  return new MarkdownParser(schema, md, {
    // Blocks
    paragraph: { block: 'paragraph' },

    heading: {
      block: 'heading',
      attrs: token => ({ level: +token.tag.slice(1) }),
    },

    bullet_list: { block: 'bulletList' },

    ordered_list: {
      block: 'orderedList',
      attrs: token => ({
        order: token.attrGet('start') ? +token.attrGet('start') : 1,
      }),
    },

    list_item: { block: 'listItem' },

    blockquote: { block: 'blockquote' },

    code_block: {
      block: 'codeBlock',
      attrs: token => ({ params: token.info || '' }),
    },

    fence: {
      block: 'codeBlock',
      attrs: token => ({ params: token.info || '' }),
    },

    hr: { node: 'horizontalRule' },

    // Inline
    strong: { mark: 'bold' },
    em: { mark: 'italic' },

    s: { mark: 'strike' },

    code_inline: { mark: 'code' },

    link: {
      mark: 'link',
      attrs: token => ({
        href: token.attrGet('href'),
        title: token.attrGet('title') || null,
      }),
    },

    hardbreak: { node: 'hardBreak' },
    text: { node: 'text' },
  })
}

export function createMarkdownSerializer(schema) {
  return new MarkdownSerializer(
    {
      // Nodes
      doc(state, node) {
        state.renderContent(node)
      },

      paragraph(state, node) {
        state.renderInline(node)
        state.closeBlock(node)
      },

      heading(state, node) {
        state.write(Array(node.attrs.level + 1).join('#') + ' ')
        state.renderInline(node)
        state.closeBlock(node)
      },

      bulletList(state, node) {
        state.renderList(node, '  ', () => '* ')
      },

      orderedList(state, node) {
        const start = node.attrs.order || 1
        state.renderList(node, '  ', i => `${start + i}. `)
      },

      listItem(state, node) {
        state.renderContent(node)
      },

      blockquote(state, node) {
        state.wrapBlock('> ', null, node, () => state.renderContent(node))
      },

      codeBlock(state, node) {
        const info = node.attrs.params || ''
        state.write('```' + info + '\n')
        state.text(node.textContent, false)
        state.write('\n```')
        state.closeBlock(node)
      },

      horizontalRule(state, node) {
        state.write('---')
        state.closeBlock(node)
      },

      hardBreak(state, node, parent, index) {
        state.write('  \n')
      },

      text(state, node) {
        state.text(node.text)
      },
    },
    {
      // Marks
      bold: {
        open: '**',
        close: '**',
        mixable: true,
        expelEnclosingWhitespace: true,
      },

      italic: {
        open: '*',
        close: '*',
        mixable: true,
        expelEnclosingWhitespace: true,
      },

      strike: {
        open: '~~',
        close: '~~',
        mixable: true,
        expelEnclosingWhitespace: true,
      },

      code: {
        open: '`',
        close: '`',
      },

      link: {
        open(_state, mark) {
          return '['
        },
        close(state, mark) {
          const href = mark.attrs.href || ''
          const title = mark.attrs.title ? ` "${mark.attrs.title}"` : ''
          return `](${href}${title})`
        },
      },
    }
  )
}
