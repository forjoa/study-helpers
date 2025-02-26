// archivo: /app/api/pdf-to-md/route.ts (o la ruta que prefieras)
import { NextRequest, NextResponse } from 'next/server'
import PDFParser, { Page, Text } from 'pdf2json'

// Almacenamiento en memoria (no persiste)
const markdownStore = new Map<string, string>()

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('pdf')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'No se subió ningún archivo' },
        { status: 400 }
      )
    }

    // Leer el archivo en un buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Convertir el PDF a Markdown usando nuestra función
    const markdown = await pdfBufferToMarkdown(buffer)

    // Generar un id único para almacenar el markdown
    const id = crypto.randomUUID()
    markdownStore.set(id, markdown)

    // Redireccionar a la página de preview (o a donde desees)
    return NextResponse.redirect(new URL(`/preview?type=pdf&id=${id}`, req.url))
  } catch (error) {
    return NextResponse.json(
      { error: `Error interno del servidor: ${error}` },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id || !markdownStore.has(id)) {
    return NextResponse.json(
      { error: 'Markdown no encontrado' },
      { status: 404 }
    )
  }

  return NextResponse.json({ markdown: markdownStore.get(id) })
}

/**
 * Convierte el buffer de un PDF a Markdown.
 * Se procesa cada página usando pdf2json y se aplica una heurística:
 * - Se agrupan los textos en líneas (por coordenada Y)
 * - Se calcula el tamaño de fuente promedio de cada línea
 * - Si la primera línea tiene un tamaño significativamente mayor (por ejemplo, > 1.2× la mediana de la página),
 *   se trata como título (usando "#").
 * - Si la segunda línea cumple un criterio similar (por ejemplo, > 1.1× la mediana pero menor que el título),
 *   se marca como subtítulo (usando "###").
 * - El resto se deja como párrafos normales.
 */
async function pdfBufferToMarkdown(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser()

    pdfParser.on('pdfParser_dataError', (errData) => {
      reject(errData.parserError)
    })

    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      let markdown = ''

      // Recorrer cada página del PDF
      pdfData.Pages.forEach((page: Page) => {
        const pageMarkdown = pageToMarkdown(page)
        // Separamos las páginas con un salto de línea adicional (sin incluir número de página)
        markdown += pageMarkdown + '\n\n'
      })

      resolve(markdown.trim())
    })

    // Procesar el buffer
    pdfParser.parseBuffer(buffer)
  })
}

/**
 * Convierte una página (objeto de pdf2json) a Markdown.
 * Se agrupan los textos por líneas basadas en la coordenada Y (agrupando con una precisión de 0.1)
 * y se aplica la heurística para detectar títulos y subtítulos.
 */
function pageToMarkdown(page: Page): string {
  // Agrupar elementos de texto por línea (según la coordenada Y)
  const linesMap = new Map<number, { texts: string[]; fontSizes: number[] }>()

  page.Texts.forEach((item: Text) => {
    // La propiedad "y" indica la posición vertical (se agrupa con 1 decimal de precisión)
    const y = parseFloat(item.y.toString())
    const yKey = Math.round(y * 10) / 10

    // Decodificar el texto (viene URL-encoded)
    const text = decodeURIComponent(item.R[0].T)
    // Suponemos que el arreglo TS: [?, fontSize, ...]
    const fontSize = item.R[0].TS[1] || 0

    if (!linesMap.has(yKey)) {
      linesMap.set(yKey, { texts: [text], fontSizes: [fontSize] })
    } else {
      const line = linesMap.get(yKey)
      line?.texts.push(text)
      line?.fontSizes.push(fontSize)
    }
  })

  // Convertir el mapa a un arreglo ordenado por la coordenada Y
  const lines = Array.from(linesMap.entries())
    .sort((a, b) => a[0] - b[0])
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .map(([_, line]) => {
      return {
        text: line.texts.join(' '),
        avgFont:
          line.fontSizes.reduce((sum, f) => sum + f, 0) / line.fontSizes.length,
      }
    })

  if (lines.length === 0) return ''

  // Calcular la mediana de tamaño de fuente de la página
  const fontSizes = lines.map((line) => line.avgFont).sort((a, b) => a - b)
  const medianFont = fontSizes[Math.floor(fontSizes.length / 2)] || 0

  let md = ''
  let startIndex = 0

  // Heurística para detectar el título: la primera línea con tamaño > 1.2 × mediana
  if (lines[0].avgFont > medianFont * 1.2) {
    md += `# ${lines[0].text}\n\n`
    startIndex = 1

    // Si la siguiente línea cumple un criterio (por ejemplo, > 1.1× la mediana) se marca como subtítulo
    if (
      lines.length > 1 &&
      lines[1].avgFont > medianFont * 1.1 &&
      lines[1].avgFont <= medianFont * 1.2
    ) {
      md += `### ${lines[1].text}\n\n`
      startIndex = 2
    }
  }

  // El resto se incluye como párrafos normales
  for (let i = startIndex; i < lines.length; i++) {
    md += `${lines[i].text}\n\n`
  }

  return md.trim()
}
