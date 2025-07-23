import Link from 'next/link'

export default function GroupCard({ group }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-bold mb-2">{group.name}</h3>
      <p className="text-gray-600 mb-4">{group.description}</p>
      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <span>{group.memberCount} members</span>
        <span>{group.activityCount} activities</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-500">
          Owner: {group.owner}
        </span>
        <Link 
          href={`/groups/${group.id}`}
          className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600"
        >
          View Group
        </Link>
      </div>
    </div>
  )
}