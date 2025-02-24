import { NextRequest, NextResponse } from "next/server";
import PizZip from "pizzip";

// memory storage (it doesn't persist)
const markdownStore = new Map();

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("ppt");

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const zip = new PizZip(buffer);

        let markdown = "";
        Object.keys(zip.files)
            .filter((filename) => filename.startsWith("ppt/slides/"))
            .sort((a, b) => extractSlideNumber(a) - extractSlideNumber(b))
            .forEach((slidePath) => {
                if (extractSlideNumber(slidePath) >= 1) {
                    markdown += `## Diapositiva ${extractSlideNumber(slidePath)}\n`;
                    markdown += transformToMarkdown(zip.files[slidePath].asText()) + "\n";
                }
            });

        // generate random id for markdown
        const id = crypto.randomUUID();

        // store markdown in memory
        markdownStore.set(id, markdown);

        // redirect to preview page with id
        return NextResponse.redirect(new URL(`/preview?id=${id}`, req.url));
    } catch (error) {
        return NextResponse.json({ error: `Internal server error: ${error}` }, { status: 500 });
    }
}

function extractSlideNumber(slidePath: string) {
    const match = slidePath.match(/slide(\d+)\.xml$/);
    return match ? parseInt(match[1], 10) : 0;
}

function transformToMarkdown(content: string) {
    return content.replace(/<[^>]+>/g, "");
}

// endpoint to get markdown information from preview page
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id || !markdownStore.has(id)) {
        return NextResponse.json({ error: "Markdown not found" }, { status: 404 });
    }

    return NextResponse.json({ markdown: markdownStore.get(id) });
}
