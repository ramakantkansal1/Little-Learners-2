import { useState } from "react";
import {
  Bell,
  CheckCircle,
  X,
  Clock,
  BookOpen,
  Trophy,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

const notifications = [
  {
    id: 1,
    type: "lesson_completed",
    title: "Lesson Completed",
    message: 'Aarav completed "Counting 1-20" with 95% score!',
    time: "2 hours ago",
    read: false,
    child: "Aarav",
    icon: BookOpen,
    color: "text-blue-500",
    bg: "bg-blue-100",
  },
  {
    id: 2,
    type: "reward_earned",
    title: "New Badge Earned",
    message: 'Anaya earned the "Math Whiz" badge!',
    time: "Yesterday, 3:45 PM",
    read: false,
    child: "Anaya",
    icon: Trophy,
    color: "text-yellow-500",
    bg: "bg-yellow-100",
  },
  {
    id: 3,
    type: "activity_completed",
    title: "Activity Complete",
    message: 'Aarav finished "Letter Sounds A-E"',
    time: "Yesterday, 10:30 AM",
    read: true,
    child: "Aarav",
    icon: BookOpen,
    color: "text-green-500",
    bg: "bg-green-100",
  },
  {
    id: 4,
    type: "stage_progress",
    title: "Stage Progress",
    message: "Anaya is 80% through Nursery stage!",
    time: "2 days ago",
    read: true,
    child: "Anaya",
    icon: TrendingUp,
    color: "text-purple-500",
    bg: "bg-purple-100",
  },
  {
    id: 5,
    type: "weekly_summary",
    title: "Weekly Summary",
    message: "Aarav completed 5 lessons this week (3h 20m)",
    time: "Monday, 9:00 AM",
    read: true,
    child: "Aarav",
    icon: Clock,
    color: "text-indigo-500",
    bg: "bg-indigo-100",
  },
  {
    id: 6,
    type: "inactivity_alert",
    title: "Learning Break",
    message: "Aarav hasn't logged in for 3 days",
    time: "Last Friday",
    read: true,
    child: "Aarav",
    icon: AlertCircle,
    color: "text-orange-500",
    bg: "bg-orange-100",
  },
  {
    id: 7,
    type: "content_recommendation",
    title: "New Content",
    message: "New Hindi rhymes added for Nursery stage",
    time: "Last Week",
    read: true,
    child: null,
    icon: BookOpen,
    color: "text-pink-500",
    bg: "bg-pink-100",
  },
  {
    id: 8,
    type: "system_announcement",
    title: "Platform Update",
    message: "New UKG content now available!",
    time: "Last Week",
    read: true,
    child: null,
    icon: Bell,
    color: "text-primary-500",
    bg: "bg-primary-100",
  },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const toggleRead = (id: number) => {
    const notif = notifications.find((n) => n.id === id);
    if (notif) notif.read = !notif.read;
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const markSelectedRead = () => {
    selectedIds.forEach((id) => {
      const notif = notifications.find((n) => n.id === id);
      if (notif) notif.read = true;
    });
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-gray-900">
            Notifications
          </h1>
          <p className="text-gray-600 mt-1">
            Stay updated on your children's learning journey
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as "all" | "unread" | "read")
            }
            className="input w-auto"
          >
            <option value="all">All</option>
            <option value="unread">
              Unread ({notifications.filter((n) => !n.read).length})
            </option>
            <option value="read">Read</option>
          </select>
          {selectedIds.length > 0 && (
            <button
              onClick={markSelectedRead}
              className="btn btn-primary btn-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Mark as Read
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 rounded-2xl bg-pastel-blue flex items-center justify-center mx-auto mb-4">
            <Bell className="w-10 h-10 text-primary-500" />
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900 mb-2">
            No notifications yet
          </h3>
          <p className="text-gray-600">
            You'll see updates here when your children complete lessons or earn
            rewards
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Bulk Actions Bar */}
          {selectedIds.length > 0 && (
            <div className="p-4 bg-primary-50 border-b border-primary-100 flex items-center justify-between">
              <span className="text-sm font-medium text-primary-700">
                {selectedIds.length} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={markSelectedRead}
                  className="btn btn-primary btn-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Read
                </button>
                <button
                  onClick={() => setSelectedIds([])}
                  className="btn btn-ghost btn-sm"
                >
                  <X className="w-4 h-4" />
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors ${!notification.read ? "bg-blue-50/50" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(notification.id)}
                  onChange={() => toggleSelect(notification.id)}
                  className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <div
                  className={`w-10 h-10 rounded-xl ${notification.bg} flex items-center justify-center flex-shrink-0`}
                >
                  <notification.icon
                    className={`w-5 h-5 ${notification.color}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3
                        className={`font-semibold text-gray-900 ${!notification.read ? "" : "text-gray-700"}`}
                      >
                        {notification.title}
                      </h3>
                      <p
                        className={`text-sm ${!notification.read ? "text-gray-700" : "text-gray-500"} mt-1`}
                      >
                        {notification.message}
                      </p>
                      {notification.child && (
                        <span className="inline-flex items-center gap-1 text-xs text-primary-500 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                          {notification.child}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {notification.time}
                      </span>
                      {!notification.read && (
                        <button
                          onClick={() => toggleRead(notification.id)}
                          className="w-2 h-2 rounded-full bg-primary-500"
                          aria-label="Mark as read"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {filteredNotifications.length} of {notifications.length}{" "}
              notifications
            </p>
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm" disabled>
                Previous
              </button>
              <button className="btn btn-ghost btn-sm" disabled>
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
