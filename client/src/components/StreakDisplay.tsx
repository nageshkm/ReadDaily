import { Flame, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { User } from "@shared/schema";

interface StreakDisplayProps {
  user: User;
  todayReadCount: number;
}

export function StreakDisplay({ user, todayReadCount }: StreakDisplayProps) {
  const { currentStreak, longestStreak } = user.streakData;

  return (
    <Card className="p-6 mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Flame className="text-orange-500 text-2xl" size={32} />
            <div>
              <div className="flex items-baseline space-x-1">
                <span className="text-3xl font-bold text-primary">
                  {currentStreak}
                </span>
                <span className="text-sm text-gray-600">day streak</span>
              </div>
              <p className="text-xs text-gray-500">
                Keep it up! Best: {longestStreak} days
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Articles read today</p>
          <div className="flex items-center space-x-1 mt-1">
            {[1, 2, 3].map((index) => (
              <Circle
                key={index}
                size={8}
                className={`${
                  index <= todayReadCount
                    ? "text-success fill-success"
                    : "text-gray-300 fill-gray-300"
                }`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-2">
              {todayReadCount}/3
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
