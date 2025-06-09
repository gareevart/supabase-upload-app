
import { Navigate } from "react-router-dom";
import PostEditor from "@/app/components/blog/PostEditor";
import { useAuth } from "@/app/contexts/AuthContext";

const NewPost = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Kreiranje nove objave</h1>
      <PostEditor />
    </div>
  );
};

export default NewPost;
