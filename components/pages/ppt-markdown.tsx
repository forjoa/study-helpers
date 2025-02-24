"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

export default function PptMarkdown() {
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const res = await fetch("/api/transform", { method: "POST", body: formData });

        if (res.redirected) {
            window.location.href = res.url;
        } else {
            alert("Error uploading file");
        }

        setLoading(false);
    };

    return (
        <form onSubmit={handleUpload} className="mt-4 flex flex-col gap-2 w-full" encType="multipart/form-data">
            <h2 className="font-bold">PowerPoint to Markdown</h2>
            <p>Put the PowerPoint file on the input below and we will return to you the Markdown file.</p>
            {loaded ? (<p>Uploaded</p>) : (
                <div className="relative">
                    <input
                        type="file"
                        name="ppt"
                        id="ppt"
                        accept=".ppt,.pptx"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        required
                        onChange={() => setLoaded(true)}
                    />
                    <label
                        htmlFor="ppt"
                        className="group flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-neutral-400 px-4 py-8 text-center transition-colors hover:border-neutral-600 hover:bg-neutral-200"
                    >
                        <Upload className="h-6 w-6 text-neutral-500 transition-colors group-hover:text-neutral-700" />
                    </label>
                </div>
            )}
            <div className="w-full flex justify-end">
                <button type="submit" disabled={loading}>
                    {loading ? "Uploading..." : "Upload"}
                </button>
            </div>
        </form>
    );
}
