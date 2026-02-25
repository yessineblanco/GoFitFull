"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PopularExercise } from "@/lib/analytics";
import { TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PopularExercisesCardProps {
  exercises: PopularExercise[];
}

const INITIAL_DISPLAY_COUNT = 5;

export default function PopularExercisesCard({
  exercises,
}: PopularExercisesCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const displayExercises = isOpen ? exercises : exercises.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = exercises.length > INITIAL_DISPLAY_COUNT;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-4 w-4" />
          Popular Exercises
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {exercises.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No exercise data available
            </p>
          ) : (
            <>
              {displayExercises.map((exercise, index) => (
                <div
                  key={exercise.id || index}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{exercise.name}</p>
                      <Badge variant="secondary" className="text-[10px] mt-0.5">
                        {exercise.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-lg font-bold">{exercise.usageCount}</p>
                    <p className="text-[10px] text-muted-foreground">uses</p>
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
                          Show All ({exercises.length})
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {exercises.slice(INITIAL_DISPLAY_COUNT).map((exercise, index) => (
                      <div
                        key={exercise.id || index + INITIAL_DISPLAY_COUNT}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
                            {index + INITIAL_DISPLAY_COUNT + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{exercise.name}</p>
                            <Badge variant="secondary" className="text-[10px] mt-0.5">
                              {exercise.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-lg font-bold">{exercise.usageCount}</p>
                          <p className="text-[10px] text-muted-foreground">uses</p>
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
