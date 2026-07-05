import Skeleton from './Skeleton';

export default function SkeletonCard() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-1.5 w-full" />
    </div>
  );
}