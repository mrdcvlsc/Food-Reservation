import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight } from 'lucide-react';

export default function NotificationItem({ notification, onClick, isAdminSide }) {
  const { actor, title, body, createdAt, read, data } = notification;

  // Format currency if needed
  const peso = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  });

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  // Default admin/staff info - only used in user-side
  const defaultAdminInfo = {
    name: "Canteen Staff",
    profilePictureUrl: "/jckl-192.png" // Your admin profile picture path
  };

  // Use admin info if actor is not defined (only in user-side)
  const displayActor = isAdminSide ? actor : (actor || defaultAdminInfo);

  // Add cache-busting for profile pictures
  const getProfileUrl = (url) => {
    if (!url) return null;
    // Add timestamp to force browser to reload the image
    return `${url}?t=${new Date().getTime()}`;
  };

  return (
    <div 
      onClick={onClick}
      className={`p-4 ${read ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-50 transition duration-150 cursor-pointer group`}
    >
      <div className="flex gap-3">
        {/* Profile Picture */}
        <div className="flex-shrink-0 w-10 h-10">
          {displayActor?.profilePictureUrl ? (
            <img
              src={getProfileUrl(displayActor.profilePictureUrl)}
              alt=""
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  displayActor?.name || 'CS'
                )}&background=random`;
              }}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm border-2 border-white">
              <span className="text-blue-600 font-medium text-sm">
                {displayActor?.name?.charAt(0)?.toUpperCase() || 'CS'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <p className="text-sm font-medium text-gray-900">
              {displayActor?.name || 'Canteen Staff'}
              {data?.studentId && !isAdminSide && (
                <span className="ml-2 text-xs text-gray-500">
                  (Admin)
                </span>
              )}
            </p>
            <span className="text-xs text-gray-500" title={new Date(createdAt).toLocaleString()}>
              {timeAgo}
            </span>
          </div>
          
          <h4 className="mt-1 text-sm font-medium text-gray-900">{title}</h4>
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{body}</p>

          {/* Preview Content */}
          {getPreviewContent(notification, peso)}
        </div>
      </div>
    </div>
  );
}

// Helper function to generate preview content
function getPreviewContent(notification, peso) {
  const data = notification?.data || {};
  
  // Top-up preview
  if (data.amount && !data.items) {
    return (
      <div className="mt-3 text-sm">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Amount</span>
          <span className="font-medium">{peso.format(data.amount)}</span>
        </div>
        {data.provider && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Method</span>
            <span className="capitalize">{data.provider}</span>
          </div>
        )}
        {data.status && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Status</span>
            <span className={`font-medium ${
              String(data.status).toLowerCase() === "approved" ? "text-green-600" :
              String(data.status).toLowerCase() === "pending" ? "text-yellow-600" : 
              String(data.status).toLowerCase() === "rejected" ? "text-red-600" :
              "text-gray-900"
            }`}>{data.status}</span>
          </div>
        )}
        {/* Add rejection reason if present */}
        {data.status?.toLowerCase() === 'rejected' && data.rejectionReason && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100">
            Reason: {data.rejectionReason}
          </div>
        )}
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
}