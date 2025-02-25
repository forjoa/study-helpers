import PdfMarkdown from '@/components/pages/pdf-markdown'
import PptMarkdown from '@/components/pages/ppt-markdown'

export default function Home() {
  return (
    <div className="p-4 mt-20">
      <p>
        Here you have all the different options about helpers in general. I made
        this project just for myself and to help me to study.
      </p>
      <PptMarkdown />
      <PdfMarkdown />
    </div>
  )
}
