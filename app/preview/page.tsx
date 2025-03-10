'use client'

import { useEffect, useState } from 'react'

export default function MarkdownPreview() {
    const [markdown, setMarkdown] = useState('Loading...')
    let id: string | null = ''
    let type: string | null = ''
    if (typeof window !== 'undefined') {
        type = new URLSearchParams(window.location.search).get('type')
        id = new URLSearchParams(window.location.search).get('id')
    }

    useEffect(() => {
        if (id) {
            // know type file
            // get method to get the markdown
            fetch(`/api/transform-${type}?id=${id}`)
                .then((res) => res.json())
                .then((data) => setMarkdown(data.markdown || 'No content available'))
                .catch(() => setMarkdown('Error loading Markdown'))
        }
    }, [id, type])

    const downloadMarkdown = () => {
        if (typeof window === 'undefined') return
        const blob = new Blob([markdown], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'presentation.md'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="p-4 mt-20">
            <h2 className="mb-4">Markdown preview</h2>
            <pre className="w-full h-[800px] p-2 border rounded overflow-x-auto">
                {markdown}
            </pre>
            <div className="mt-4 flex justify-end">
                <button onClick={downloadMarkdown}>Download Markdown</button>
            </div>
        </div>
    )
}
