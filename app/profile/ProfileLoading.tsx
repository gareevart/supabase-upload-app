import { Skeleton } from "@gravity-ui/uikit";

export const ProfileLoading = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Skeleton className="w-8 h-8 rounded-full border-4 border-t-primary border-r-transparent border-b-primary border-l-transparent animate-spin" />
    </div>
  );
};
