export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16 space-y-3">
      {Icon && (
        <div className="flex justify-center">
          <Icon size={44} className="text-gray-700" />
        </div>
      )}
      <p className="text-gray-300 font-medium">{title}</p>
      {description && (
        <p className="text-gray-500 text-sm max-w-xs mx-auto">{description}</p>
      )}
      {action && (
        <div className="pt-2">{action}</div>
      )}
    </div>
  );
}