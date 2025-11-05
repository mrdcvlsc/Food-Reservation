export default function NotificationItem({ notification }) {
  const { actor, title, body, createdAt, read, data } = notification;

  // Format currency if needed
  const peso = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  });

  return (
    <div className={`p-4 ${read ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-50`}>
      <div className="flex gap-3">
        {/* Profile Picture */}
        <div className="flex-shrink-0 w-10 h-10">
          {actor?.profilePicture ? (
            <img
              src={actor.profilePicture}
              alt={`${actor.name}'s profile`}
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(actor?.name || 'U')}&background=random`;
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-medium text-sm">
                {actor?.name?.charAt(0) || 'U'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-gray-900">
              {actor?.name || 'Unknown User'}
              {data?.student?.id && (
                <span className="ml-2 text-xs text-gray-500">
                  ({data.student.id})
                </span>
              )}
            </p>
            <span className="text-xs text-gray-500">
              {new Date(createdAt).toLocaleString()}
            </span>
          </div>
          
          <h4 className="mt-1 text-sm font-medium text-gray-900">{title}</h4>
          <p className="mt-1 text-sm text-gray-500">{body}</p>

          {/* Additional Order Details */}
          {data?.items && (
            <div className="mt-2 text-sm text-gray-600">
              <p className="font-medium">Order Details:</p>
              <ul className="mt-1 space-y-1">
                {data.items.map((item, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span>{item.qty}x {item.name}</span>
                    <span>{peso.format(item.price * item.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between font-medium">
                <span>Total:</span>
                <span>{peso.format(data.total)}</span>
              </div>
            </div>
          )}

          {/* Student Details if present */}
          {data?.student?.grade && (
            <p className="mt-2 text-sm text-gray-500">
              Grade {data.student.grade} - {data.student.section}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}