export default function DashboardLoading() {
  return (
    <div className="w-full space-y-4 animate-pulse py-4">
      {/* Top bar skeleton */}
      <div className="h-10 w-48 bg-gray-200 rounded-xl" />

      {/* Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Main content block */}
      <div className="h-64 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
