import { User } from "@shared/schema";
import { LocalStorage } from "@/lib/storage";
import { useEffect, useState } from "react";

interface StreakProgressBarProps {
  user: User;
}

export function StreakProgressBar({ user }: StreakProgressBarProps) {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const todayReadCount = LocalStorage.getTodayReadCount(user);
  const dailyGoal = 3;
  const actualProgress = (todayReadCount / dailyGoal) * 100;
  const progress = Math.min(actualProgress, 100);
  const isComplete = todayReadCount >= dailyGoal;
  
  const progressColor = isComplete ? '#10b981' : '#f97316';
  
  return (
    <div className={`fixed left-0 right-0 z-50 ${isMobile ? 'bottom-16' : 'bottom-0'}`}>
      {/* Main progress bar */}
      <div 
        className="h-2 bg-gray-200 relative"
        title={`${todayReadCount}/${dailyGoal} articles read today • ${user.streakData.currentStreak} day streak`}
      >
        {/* Progress fill */}
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ 
            width: `${Math.max(progress, todayReadCount > 0 ? 8 : 0)}%`,
            backgroundColor: progressColor
          }}
        />
        
        {/* Goal markers */}
        <div className="absolute top-0 left-1/3 w-px h-full bg-white opacity-50" />
        <div className="absolute top-0 left-2/3 w-px h-full bg-white opacity-50" />
        
        {/* Streak indicator */}
        {user.streakData.currentStreak > 0 && (
          <div 
            className="absolute top-0 right-2 h-full flex items-center text-xs font-bold text-white"
            style={{ fontSize: '10px' }}
          >
            {user.streakData.currentStreak}🔥
          </div>
        )}
      </div>
    </div>
  );
}