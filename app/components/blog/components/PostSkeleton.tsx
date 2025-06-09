
import { Skeleton } from '@gravity-ui/uikit';


export const PostSkeleton = () => {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <Skeleton className="h-12 w-3/4 mb-6" />
      <Skeleton className="h-80 w-full mb-6" />
      <Skeleton className="h-6 w-full mb-2" />
      <Skeleton className="h-6 w-5/6 mb-2" />
      <Skeleton className="h-6 w-4/6 mb-6" />
    </div>
  );
};
