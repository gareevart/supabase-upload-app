import { useState } from "react"
import { uploadFile, getPublicUrl } from "@/lib/yandexStorage"

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  const uploadImage = async (file: File): Promise<string> => {
    if (!file) {
      throw new Error("No file provided")
    }

    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Upload to Yandex Storage
      const uploadResult = await uploadFile(file, 'editor-images')
      
      if (uploadResult.error) {
        throw uploadResult.error
      }

      // Get public URL for the uploaded file
      const publicUrl = await getPublicUrl(uploadResult.data.path)
      
      setIsUploading(false)
      setProgress(100)
      
      return publicUrl
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error during upload"))
      setIsUploading(false)
      throw err
    }
  }

  return {
    uploadImage,
    isUploading,
    progress,
    error,
  }
}