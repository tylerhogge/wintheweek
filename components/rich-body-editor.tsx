'use client'

import { useRef, useEffect, useCallback } from 'react'

/* ── pill styling (Tailwind-safe inline) ── */
const PILL_STYLE =
  'display:inline-flex;align-items:center;padding:1px 8px;border-radius:9999px;background:rgba(16,185,129,0.15);color:rgb(16,185,129);font-size:13px;font-weight:500;margin:0 2px;user-select:none;vertical-align:baseline;line-height:1.6;'

/* ── helpers ── */

function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped
    .replace(
      /\{\{name\}\}/g,
      `<span contenteditable="false" data-token="name" style="${PILL_STYLE}">First Name</span>`,
    )
    .replace(/\n/g, '<br>')
}

function htmlToText(el: HTMLElement): string {
  let text = ''
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? ''
    } else if (node instanceof HTMLElement) {
      if (node.dataset.token === 'name') {
        text += '{{name}}'
      } else if (node.tagName === 'BR') {
        text += '\n'
      } else if (node.tagName === 'DIV') {
        // Chrome wraps new lines in <div>
        if (text.length > 0 && !text.endsWith('\n')) text += '\n'
        text += htmlToText(node)
      } else {
        text += htmlToText(node)
      }
    }
  }
  return text
}

/* ── component ── */

type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function RichBodyEditor({ value, onChange, className }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)

  /* Set content once on mount */
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = textToHtml(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleInput = useCallback(() => {
    if (!editorRef.current) return
    onChange(htmlToText(editorRef.current))
  }, [onChange])

  /* Strip formatting on paste */
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, text)
  }

  function insertFirstName() {
    const el = editorRef.current
    if (!el) return

    const pill = document.createElement('span')
    pill.contentEditable = 'false'
    pill.dataset.token = 'name'
    pill.setAttribute('style', PILL_STYLE)
    pill.textContent = 'First Name'

    el.focus()
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(pill)
      const space = document.createTextNode('\u00A0')
      range.setStartAfter(pill)
      range.insertNode(space)
      range.setStartAfter(space)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      el.appendChild(pill)
      el.appendChild(document.createTextNode('\u00A0'))
    }
    handleInput()
  }

  const hasName = value.includes('{{name}}')

  return (
    <div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        className={className}
        style={{ minHeight: '180px', whiteSpace: 'pre-wrap', lineHeight: '1.7' }}
      />
      {!hasName && (
        <button
          type="button"
          onClick={insertFirstName}
          className="text-xs text-accent/70 hover:text-accent mt-1.5 transition-colors"
        >
          + Add employee first name
        </button>
      )}
    </div>
  )
}
