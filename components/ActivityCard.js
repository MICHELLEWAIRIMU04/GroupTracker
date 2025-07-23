import Link from 'next/link'

export default function ActivityCard({ activity }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-bold mb-2">{activity.name}</h3>
      <p className="text-gray-600 mb-4">{activity.description}</p>
      
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Contributors:</span>
          <span className="font-medium">{activity.contributorCount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Contributions:</span>
          <span className="font-medium">{activity.contributionCounts.total}</span>
        </div>
        {Object.keys(activity.totals.money).length > 0 && (
          <div className="text-sm">
            <span className="text-gray-500">Money: </span>
            {Object.entries(activity.totals.money).map(([currency, amount]) => (
              <span key={currency} className="font-medium mr-2">
                {currency} {amount}
              </span>
            ))}
          </div>
        )}
        {activity.totals.time.minutes > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Time:</span>
            <span className="font-medium">{activity.totals.time.formatted}</span>
          </div>
        )}
      </div>
      
      <Link 
        href={`/activities/${activity.id}`}
        className="block w-full bg-blue-500 text-white text-center px-4 py-2 rounded hover:bg-blue-600"
      >
        View Details
      </Link>
    </div>
  )
}