import { User } from "@shared/schema";
import { LocalStorage } from "@/lib/storage";

interface StreakProgressBarProps {
  user: User;
}

export function StreakProgressBar({ user }: StreakProgressBarProps) {
  const todayReadCount = LocalStorage.getTodayReadCount(user);
  const dailyGoal = 3; // Default daily goal
  const progress = Math.min((todayReadCount / dailyGoal) * 100, 100);
  const isComplete = todayReadCount >= dailyGoal;
  
  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-40 sm:bottom-16 h-1 bg-gray-200"
      style={{ 
        background: `linear-gradient(to right, ${isComplete ? '#10b981' : '#f97316'} ${progress}%, #e5e7eb ${progress}%)` 
      }}
      title={`${todayReadCount}/${dailyGoal} articles read today • ${user.streakData.currentStreak} day streak`}
    />
  );
}