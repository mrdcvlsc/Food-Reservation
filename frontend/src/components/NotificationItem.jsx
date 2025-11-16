import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Clock, DollarSign, Package, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function NotificationItem({ notification, onClick, isAdminSide }) {
  const { actor, title, body, createdAt, read, data } = notification;

  // Format currency
  const peso = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  });

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  // Default admin/staff info - only used in user-side
  const defaultAdminInfo = {
    name: "Canteen Staff",
    profilePictureUrl: "/jckl-192.png"
  };

  // Use admin info if actor is not defined (only in user-side)
  const displayActor = isAdminSide ? actor : (actor || defaultAdminInfo);

  // Add cache-busting for profile pictures
  const getProfileUrl = (url) => {
    if (!url) return null;
    return `${url}?t=${new Date().getTime()}`;
  };

  // Get notification type for styling
  const getNotificationType = () => {
    if (data?.status) {
      const status = String(data.status).toLowerCase();
      if (status === 'approved') return 'success';
      if (status === 'rejected' || status === 'cancelled') return 'error';
      if (status === 'pending') return 'warning';
    }
    return 'default';
  };

  const notifType = getNotificationType();

  return (
    <div 
      onClick={onClick}
      className={`relative ${read ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-50 active:bg-gray-100 transition duration-150 cursor-pointer group border-b border-gray-100 last:border-b-0`}
    >
      {/* Unread indicator dot */}
      {!read && (
        <div className="absolute left-2 top-4 w-2 h-2 bg-blue-500 rounded-full" />
      )}

      <div className="p-3 sm:p-4 pl-6 sm:pl-4">
        <div className="flex gap-3">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {displayActor?.profilePictureUrl ? (
              <img
                src={getProfileUrl(displayActor.profilePictureUrl)}
                alt=""
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white shadow-sm"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    displayActor?.name || 'CS'
                  )}&background=random`;
                }}
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center shadow-sm border-2 border-white">
                <span className="text-blue-600 font-medium text-xs sm:text-sm">
                  {displayActor?.name?.charAt(0)?.toUpperCase() || 'CS'}
                </span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex justify-between items-start gap-2 mb-1">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                  {displayActor?.name || 'Canteen Staff'}
                </p>
                {data?.studentId && !isAdminSide && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700 font-medium">
                    Admin
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-xs text-gray-500 whitespace-nowrap flex-shrink-0" title={new Date(createdAt).toLocaleString()}>
                <Clock className="w-3 h-3 inline mr-0.5" />
                {timeAgo}
              </span>
            </div>
            
            {/* Title */}
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-1 mb-1">
              {title}
            </h4>

            {/* Body */}
            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">
              {body}
            </p>

            {/* Preview Content */}
            {getPreviewContent(notification, peso, notifType)}

            {/* See details indicator for mobile */}
            <div className="mt-2 flex items-center justify-end sm:hidden">
              <span className="text-xs text-blue-600 flex items-center gap-1">
                Tap to view
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to generate preview content
function getPreviewContent(notification, peso, notifType) {
  const data = notification?.data || {};
  
  // Get status icon
  const getStatusIcon = (status) => {
    const statusLower = String(status).toLowerCase();
    if (statusLower === 'approved') return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
    if (statusLower === 'rejected' || statusLower === 'cancelled') return <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
    if (statusLower === 'pending') return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4" />;
    return null;
  };

  // Get status color classes
  const getStatusColorClass = (status) => {
    const statusLower = String(status).toLowerCase();
    if (statusLower === 'approved') return 'bg-green-50 border-green-200 text-green-700';
    if (statusLower === 'rejected' || statusLower === 'cancelled') return 'bg-red-50 border-red-200 text-red-700';
    if (statusLower === 'pending') return 'bg-yellow-50 border-yellow-200 text-yellow-700';
    return 'bg-gray-50 border-gray-200 text-gray-700';
  };

  // Top-up preview
  if (data.amount && !data.items) {
    return (
      <div className="mt-2 space-y-2">
        {/* Amount card */}
        <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-100">
          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
            <div>
              <div className="flex items-center gap-1 text-gray-500 mb-1">
                <DollarSign className="w-3 h-3" />
                <span>Amount</span>
              </div>
              <div className="font-semibold text-gray-900">{peso.format(data.amount)}</div>
            </div>
            
            {data.provider && (
              <div>
                <div className="text-gray-500 mb-1">Method</div>
                <div className="font-medium text-gray-900 capitalize truncate">{data.provider}</div>
              </div>
            )}
          </div>

          {/* Status */}
          {data.status && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${getStatusColorClass(data.status)}`}>
                {getStatusIcon(data.status)}
                <span>{data.status}</span>
              </div>
            </div>
          )}
        </div>

        {/* Rejection reason - expanded on mobile */}
        {data.status?.toLowerCase() === 'rejected' && data.rejectionReason && (
          <div className="bg-red-50 rounded-lg p-2 sm:p-3 border border-red-200">
            <div className="flex items-start gap-2">
              <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-red-900 mb-1">Rejection Reason</div>
                <p className="text-xs text-red-700">{data.rejectionReason}</p>
              </div>
            </div>
          </div>
        )}

        {/* Reference number if available */}
        {data.referenceNumber && (
          <div className="text-[10px] sm:text-xs text-gray-500">
            Ref: <span className="font-mono">{data.referenceNumber}</span>
          </div>
        )}
      </div>
    );
  }

  // Order/Reservation preview
  if (data?.items) {
    return (
      <div className="mt-2">
        <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Package className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">{data.items.length}</span> item{data.items.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-xs sm:text-sm font-semibold text-gray-900">
              {peso.format(data.total || 0)}
            </div>
          </div>

          {/* Order status if available */}
          {data.orderStatus && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${getStatusColorClass(data.orderStatus)}`}>
                {getStatusIcon(data.orderStatus)}
                <span>{data.orderStatus}</span>
              </div>
            </div>
          )}

          {/* Order ID if available */}
          {data.orderId && (
            <div className="mt-2 text-[10px] sm:text-xs text-gray-500">
              Order #<span className="font-mono">{data.orderId}</span>
            </div>
          )}
        </div>

        {/* See details button - hidden on mobile, shown on desktop */}
        <div className="hidden sm:flex items-center justify-end mt-2">
          <span className="text-xs text-blue-600 group-hover:text-blue-700 flex items-center gap-1 font-medium">
            See Details
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    );
  }

  return null;
}