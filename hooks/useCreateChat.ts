import { useRouter } from "next/navigation";
import { useChats } from "@/hooks/useChats";

export const useCreateChat = () => {
  const router = useRouter();
  const { createChat } = useChats();

  const handleCreateChat = async () => {
    try {
      const result = await createChat.mutateAsync();
      if (result && result.id) {
        router.push(`/chat/${result.id}`);
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    }
  };

  return {
    handleCreateChat,
    createChat
  };
};