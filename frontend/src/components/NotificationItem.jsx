import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight } from 'lucide-react'; // Add this import

export default function NotificationItem({ notification, onClick }) {
  const { actor, title, body, createdAt, read, data } = notification;

  // Format currency if needed
  const peso = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  });

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  // Get notification type-specific preview content
  const getPreviewContent = () => {
    if (data?.amount) {
      return (
        <div className="mt-2 space-y-2">
          {/* Amount and Payment Details */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Amount: {peso.format(data.amount)}</span>
            <span className="text-gray-600">{data.provider || 'GCash'}</span>
          </div>

          {/* Student Details */}
          {data.student && (
            <div className="text-xs border-t border-gray-100 pt-2 mt-2">
              <div className="text-gray-500 space-y-1">
                <div>Student ID: {data.studentId}</div>
                {data.student.grade && (
                  <div>Grade {data.student.grade}{data.student.section && ` - ${data.student.section}`}</div>
                )}
                {data.student.contact && (
                  <div>Contact: {data.student.contact}</div>
                )}
              </div>
            </div>
          )}

          {/* See Details Button */}
          <div className="flex justify-end">
            <span className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm">
              See Details <ChevronRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      );
    }
    if (data?.items) {
      return (
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {data.items.length} item{data.items.length !== 1 ? 's' : ''} • {peso.format(data.total || 0)}
          </span>
          <span className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
            See Details <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      onClick={onClick}
      className={`p-4 ${read ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-50 transition duration-150 cursor-pointer group`}
    >
      <div className="flex gap-3">
        {/* Profile Picture */}
        <div className="flex-shrink-0 w-10 h-10">
          {actor?.profilePictureUrl ? (
            <img
              src={actor.profilePictureUrl}
              alt=""
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  actor?.name || 'U'
                )}&background=random`;
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm border-2 border-white">
              <span className="text-blue-600 font-medium text-sm">
                {actor?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-gray-900">
              {actor?.name || 'Unknown User'}
              {data?.studentId && (
                <span className="ml-2 text-xs text-gray-500">
                  ({data.studentId})
                </span>
              )}
            </p>
            <span className="text-xs text-gray-500" title={new Date(createdAt).toLocaleString()}>
              {timeAgo}
            </span>
          </div>
          
          <h4 className="mt-1 text-sm font-medium text-gray-900">{title}</h4>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{body}</p>

          {/* Preview Content with See Details */}
          {getPreviewContent()}
        </div>
      </div>
    </div>
  );
}