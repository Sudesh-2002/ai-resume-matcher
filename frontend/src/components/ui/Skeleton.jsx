export default function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-800 rounded-lg ${className}`} />
  );
}