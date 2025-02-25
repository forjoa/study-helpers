import { NextRequest, NextResponse } from 'next/server'
import PizZip from 'pizzip'
import { DOMParser } from 'xmldom'

// types
type Shape = {
  placeholderType: string
  shapeName: string
  text: string
}

type Slide = { shapes: Shape[] }

// memory storage (it doesn't persist)
const markdownStore = new Map()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('ppt')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const zip = new PizZip(buffer)

    let markdown = ''
    Object.keys(zip.files)
      .filter((filename) => filename.startsWith('ppt/slides/'))
      .sort((a, b) => extractSlideNumber(a) - extractSlideNumber(b))
      .forEach((slidePath) => {
        const slideNumber = extractSlideNumber(slidePath)
        if (slideNumber >= 1) {
          const slideXML = zip.files[slidePath].asText()
          const slide = parseSlideXML(slideXML)
          markdown += slideToMarkdown(slide, slideNumber) + '\n'
        }
      })

    // generate random id for markdown
    const id = crypto.randomUUID()

    // store markdown in memory
    markdownStore.set(id, markdown)

    // redirect to preview page with id
    return NextResponse.redirect(new URL(`/preview?id=${id}`, req.url))
  } catch (error) {
    return NextResponse.json(
      { error: `Internal server error: ${error}` },
      { status: 500 }
    )
  }
}

// endpoint to get markdown information from preview page
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id || !markdownStore.has(id)) {
    return NextResponse.json({ error: 'Markdown not found' }, { status: 404 })
  }

  return NextResponse.json({ markdown: markdownStore.get(id) })
}

// function to get the slide number
function extractSlideNumber(slidePath: string) {
  const match = slidePath.match(/slide(\d+)\.xml$/)
  return match ? parseInt(match[1], 10) : 0
}

// raw ppt or pptx slide to md
function parseSlideXML(xmlContent: string): Slide {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlContent, 'application/xml')

  const slide: Slide = { shapes: [] }
  const spNodes = doc.getElementsByTagName('p:sp')
  for (let i = 0; i < spNodes.length; i++) {
    const shapeNode = spNodes[i]

    // detect the content type by node <p:ph>
    const phNodes = shapeNode.getElementsByTagName('p:ph')
    let placeholderType = ''
    if (phNodes.length > 0) {
      placeholderType = phNodes[0].getAttribute('type') || ''
    }

    // extract the shape name (for identifying titles or subtitles)
    const cNvPrNodes = shapeNode.getElementsByTagName('p:cNvPr')
    let shapeName = ''
    if (cNvPrNodes.length > 0) {
      shapeName = cNvPrNodes[0].getAttribute('name') || ''
    }

    // extract textual content from the shape (searching nodes <a:t> inside <p:txBody>)
    let textContent = ''
    const txBodyNodes = shapeNode.getElementsByTagName('p:txBody')
    if (txBodyNodes.length > 0) {
      const aTNodes = txBodyNodes[0].getElementsByTagName('a:t')
      for (let j = 0; j < aTNodes.length; j++) {
        textContent += aTNodes[j].textContent
      }
    }

    slide.shapes.push({
      placeholderType,
      shapeName,
      text: textContent.trim(),
    })
  }
  return slide
}

// xml to markdown
function slideToMarkdown(slide: Slide, slideNumber: number): string {
  let md = `## Diapositiva ${slideNumber}\n\n`
  const titleShape = slide.shapes.find(
    (s) =>
      s.placeholderType.toLowerCase() === 'title' ||
      (s.shapeName && s.shapeName.toLowerCase().includes('título'))
  )
  if (titleShape && titleShape.text) {
    md += `# ${titleShape.text} \n\n`
  }

  slide.shapes.forEach((shape) => {
    // if it is a title, skip it
    if (shape.placeholderType.toLowerCase() === 'title') return

    if (
      shape.shapeName &&
      shape.shapeName.toLowerCase().includes('subtítulo') &&
      shape.text
    ) {
      md += `### ${shape.text}\n\n`
    } else if (shape.text) {
      md += `${shape.text}\n\n`
    }
  })
  return md
}