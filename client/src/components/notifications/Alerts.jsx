
import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Badge } from "../ui/badge";
import { useSocket } from "../../context/socket-context";

export function Alerts() {
  const { monitoringAlerts } = useSocket();
  const [readAlerts, setReadAlerts] = useState(new Set());

  const unreadCount = monitoringAlerts.filter((alert) => !readAlerts.has(alert.data._id)).length;

  const markAsRead = (alertId) => {
    setReadAlerts((prev) => new Set([...prev, alertId]));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Alerts (${unreadCount} unread)`}>
          <Bell className="h-5 w-5 text-red-500" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-white border shadow-xl rounded-xl p-4" align="end">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium">Monitoring Alerts</h4>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setReadAlerts(new Set(monitoringAlerts.map((a) => a.data._id)));
              }}
              className="text-blue-600 text-xs"
            >
              Mark all as read
            </Button>
          )}
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {monitoringAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No new alerts</p>
          ) : (
            monitoringAlerts.map((alert) => (
              <div
                key={alert.data._id}
                className={`p-2 rounded-md text-sm ${readAlerts.has(alert.data._id) ? "bg-muted/50" : "bg-red-50 dark:bg-red-900/20"}`}
                onClick={() => markAsRead(alert.data._id)}
              >
                <p className="font-medium">{alert.data.title}</p>
                <p className="text-xs text-muted-foreground">{alert.data.description}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
