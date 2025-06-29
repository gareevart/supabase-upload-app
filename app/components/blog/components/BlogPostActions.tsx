"use client"

import { useState } from "react"
import { Button } from "@gravity-ui/uikit"
import { Pencil, TrashBin } from "@gravity-ui/icons"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

interface BlogPostActionsProps {
  postId: string
  postSlug: string | null
}

export default function BlogPostActions({ postId, postSlug }: BlogPostActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этот пост?")) {
      return
    }

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", postId)

      if (error) {
        throw error
      }

      toast({
        title: "Успех",
        description: "Пост успешно удален",
        variant: "default"
      })
      
      router.push("/blog")
    } catch (error) {
      console.error("Error deleting post:", error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить пост",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Link href={`/blog/edit/${postId}`} passHref>
        <Button view="outlined" size="m">
          <Pencil className="w-4 h-4 mr-1" />
          Редактировать
        </Button>
      </Link>
      <Button 
        view="outlined" 
        size="m" 
        onClick={handleDelete}
        loading={isDeleting}
        disabled={isDeleting}
      >
        <TrashBin className="w-4 h-4 mr-1" />
        Удалить
      </Button>
    </div>
  )
}