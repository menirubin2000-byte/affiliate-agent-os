"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getVideoUploadSignedUrl, confirmVideoUpload } from "../../actions"

export function VideoUploadClient({ productId }: { productId: string }) {
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setStatus("uploading")
    setProgress(0)
    setErrorMsg("")

    try {
      const ext = file.name.split(".").pop() ?? "mp4"
      const result = await getVideoUploadSignedUrl(productId, ext)
      if ("error" in result) {
        setErrorMsg(result.error)
        setStatus("error")
        return
      }

      const xhr = new XMLHttpRequest()
      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        })
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        })
        xhr.addEventListener("error", () => reject(new Error("Upload network error")))
        xhr.open("PUT", result.signedUrl)
        xhr.setRequestHeader("Content-Type", file.type || `video/${ext}`)
        xhr.send(file)
      })

      const confirm = await confirmVideoUpload(productId, result.storagePath)
      if ("error" in confirm) {
        setErrorMsg(confirm.error)
        setStatus("error")
        return
      }

      setStatus("done")
      router.refresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Upload failed")
      setStatus("error")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
      <input ref={fileRef} type="file" accept="video/*" required className="text-sm" />
      <Button type="submit" variant="outline" size="sm" disabled={status === "uploading"}>
        {status === "uploading" ? `מעלה... ${progress}%` : "העלה וידאו"}
      </Button>
      {status === "done" && (
        <span className="text-sm text-green-600 font-medium">הוידאו הועלה בהצלחה!</span>
      )}
      {status === "error" && (
        <span className="text-sm text-red-600 font-medium">{errorMsg || "שגיאה בהעלאה"}</span>
      )}
    </form>
  )
}
