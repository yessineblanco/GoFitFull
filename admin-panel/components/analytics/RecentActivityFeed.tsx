"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecentActivity } from "@/lib/analytics";
import { Clock, Dumbbell, UserPlus, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface RecentActivityFeedProps {
  activities: RecentActivity[];
}

const INITIAL_DISPLAY_COUNT = 5;

export default function RecentActivityFeed({
  activities,
}: RecentActivityFeedProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayActivities = isOpen ? activities : activities.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = activities.length > INITIAL_DISPLAY_COUNT;

  const getIcon = (type: string) => {
    switch (type) {
      case "workout_completed":
        return <Dumbbell className="h-3 w-3" />;
      case "user_joined":
        return <UserPlus className="h-3 w-3" />;
      case "workout_created":
        return <Plus className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "workout_completed":
        return "Workout";
      case "user_joined":
        return "New User";
      case "workout_created":
        return "Created";
      default:
        return "Activity";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No recent activity
            </p>
          ) : (
            <>
              {displayActivities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-2">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px]">
                      {activity.user_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-medium truncate">{activity.user_name}</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">
                        {getTypeLabel(activity.type)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {activity.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {getIcon(activity.type)}
                      <span>{formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                      })}</span>
                    </p>
                  </div>
                </div>
              ))}
              {hasMore && (
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs h-8"
                    >
                      {isOpen ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Show All ({activities.length})
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {activities.slice(INITIAL_DISPLAY_COUNT).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-2">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {activity.user_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-medium truncate">{activity.user_name}</p>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 shrink-0">
                              {getTypeLabel(activity.type)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {activity.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            {getIcon(activity.type)}
                            <span>{formatDistanceToNow(new Date(activity.timestamp), {
                              addSuffix: true,
                            })}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
