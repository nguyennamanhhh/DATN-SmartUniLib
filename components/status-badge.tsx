type StatusBadgeProps = {
  status: string;
};

const statusConfig: Record<
  string,
  {
    label: string;
    className: string;
  }
> = {
  PENDING: {
    label: "Chờ duyệt",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-200",
  },

  APPROVED: {
    label: "Đã duyệt",
    className:
      "bg-green-100 text-green-700 border-green-200",
  },

  REJECTED: {
    label: "Từ chối",
    className:
      "bg-red-100 text-red-700 border-red-200",
  },

  UNDER_REVIEW: {
    label: "Đang xem xét",
    className:
      "bg-orange-100 text-orange-700 border-orange-200",
  },

  REMOVED: {
    label: "Đã gỡ",
    className:
      "bg-gray-100 text-gray-700 border-gray-200",
  },

  CONFIRMED: {
    label: "Đã xác nhận",
    className:
      "bg-blue-100 text-blue-700 border-blue-200",
  },

  CANCELLED_BY_USER: {
    label: "Đã hủy",
    className:
      "bg-gray-100 text-gray-700 border-gray-200",
  },

  NO_SHOW: {
    label: "No-show",
    className:
      "bg-red-100 text-red-700 border-red-200",
  },

  UPHELD: {
    label: "Khiếu nại đúng",
    className:
      "bg-red-100 text-red-700 border-red-200",
  },
};

export function StatusBadge({
  status,
}: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    className:
      "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}