"use client"
export default function MobileCardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    </div>
  );
}