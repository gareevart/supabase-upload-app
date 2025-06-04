"use client"

import PostList from "./PostList";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen pb-20 sm:p-20">
      <main className="flex flex-col row-start-2 items-center sm:items-start w-full max-w-4xl">
        <PostList />
      </main>
    </div>
  );
}
