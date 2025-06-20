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
  const progress = Math.max(5, Math.min((todayReadCount / dailyGoal) * 100, 100)); // Minimum 5% to ensure visibility
  const isComplete = todayReadCount >= dailyGoal;
  
  const progressColor = isComplete ? '#10b981' : '#f97316';
  
  return (
    <div className={`fixed left-0 right-0 z-50 ${isMobile ? 'bottom-16' : 'bottom-0'}`}>
      <div 
        className="h-1 bg-gray-200"
        title={`${todayReadCount}/${dailyGoal} articles read today • ${user.streakData.currentStreak} day streak`}
      >
        <div 
          className="h-full transition-all duration-300 ease-out"
          style={{ 
            width: `${progress}%`,
            backgroundColor: progressColor
          }}
        />
      </div>
    </div>
  );
}