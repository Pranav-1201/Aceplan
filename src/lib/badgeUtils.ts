import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type BadgeType = 
  | 'first_study_session'
  | 'first_exam'
  | 'first_subject'
  | 'profile_complete'
  | 'study_1_hour'
  | 'study_3_hours'
  | 'study_6_hours'
  | 'study_streak_3'
  | 'study_streak_7'
  | 'study_streak_15'
  | 'study_streak_30';

export interface Badge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  earned_at: string;
  created_at: string;
}

export const BADGE_INFO: Record<BadgeType, { name: string; description: string; icon: string }> = {
  first_study_session: {
    name: "First Steps",
    description: "Complete your first study session",
    icon: "🎯"
  },
  first_exam: {
    name: "Exam Ready",
    description: "Add your first exam",
    icon: "📝"
  },
  first_subject: {
    name: "Subject Master",
    description: "Add your first subject",
    icon: "📚"
  },
  profile_complete: {
    name: "Profile Pro",
    description: "Complete all personal information",
    icon: "👤"
  },
  study_1_hour: {
    name: "Hour Hero",
    description: "Complete a 1-hour study session",
    icon: "⏰"
  },
  study_3_hours: {
    name: "Marathon Mind",
    description: "Complete a 3-hour study session",
    icon: "🏃"
  },
  study_6_hours: {
    name: "Study Champion",
    description: "Complete a 6-hour study session",
    icon: "🏆"
  },
  study_streak_3: {
    name: "3-Day Streak",
    description: "Study for 3 consecutive days",
    icon: "🔥"
  },
  study_streak_7: {
    name: "Week Warrior",
    description: "Study for 7 consecutive days",
    icon: "⭐"
  },
  study_streak_15: {
    name: "Fortnight Fighter",
    description: "Study for 15 consecutive days",
    icon: "💪"
  },
  study_streak_30: {
    name: "Month Master",
    description: "Study for 30 consecutive days",
    icon: "👑"
  }
};

export async function checkAndAwardBadge(userId: string, badgeType: BadgeType): Promise<boolean> {
  try {
    // Check if user already has this badge
    const { data: existing } = await supabase
      .from("user_badges")
      .select("id")
      .eq("user_id", userId)
      .eq("badge_type", badgeType)
      .single();

    if (existing) return false;

    // Award the badge
    const { error } = await supabase
      .from("user_badges")
      .insert({ user_id: userId, badge_type: badgeType });

    if (error) throw error;

    const badgeInfo = BADGE_INFO[badgeType];
    toast.success(`🎉 Badge Unlocked: ${badgeInfo.icon} ${badgeInfo.name}!`, {
      description: badgeInfo.description
    });

    return true;
  } catch (error) {
    console.error("Failed to award badge:", error);
    return false;
  }
}

export async function checkStudySessionBadges(userId: string, durationSeconds: number) {
  const hours = durationSeconds / 3600;

  // Check duration badges
  if (hours >= 6) {
    await checkAndAwardBadge(userId, 'study_6_hours');
  } else if (hours >= 3) {
    await checkAndAwardBadge(userId, 'study_3_hours');
  } else if (hours >= 1) {
    await checkAndAwardBadge(userId, 'study_1_hour');
  }

  // Check first session badge
  await checkAndAwardBadge(userId, 'first_study_session');

  // Check streak badges
  await checkStudyStreaks(userId);
}

async function checkStudyStreaks(userId: string) {
  try {
    // Get all study sessions ordered by date
    const { data: sessions, error } = await supabase
      .from("study_sessions")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) throw error;
    if (!sessions || sessions.length === 0) return;

    // Get unique dates
    const uniqueDates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    
    // Calculate current streak
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date(today);

    for (let i = 0; i < uniqueDates.length; i++) {
      const sessionDate = uniqueDates[i];
      const expectedDate = checkDate.toISOString().split('T')[0];

      if (sessionDate === expectedDate) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0 && sessionDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]) {
        // Allow for yesterday if today hasn't been done yet
        streak++;
        checkDate = new Date(sessionDate);
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Award streak badges
    if (streak >= 30) {
      await checkAndAwardBadge(userId, 'study_streak_30');
    } else if (streak >= 15) {
      await checkAndAwardBadge(userId, 'study_streak_15');
    } else if (streak >= 7) {
      await checkAndAwardBadge(userId, 'study_streak_7');
    } else if (streak >= 3) {
      await checkAndAwardBadge(userId, 'study_streak_3');
    }
  } catch (error) {
    console.error("Failed to check study streaks:", error);
  }
}

export async function checkProfileCompleteBadge(userId: string, profile: any) {
  const requiredFields = [
    'full_name',
    'username',
    'birthday',
    'profession',
    'school_name'
  ];

  const isComplete = requiredFields.every(field => profile[field] && profile[field].toString().trim() !== '');

  if (isComplete) {
    await checkAndAwardBadge(userId, 'profile_complete');
  }
}

export async function getUserBadges(userId: string): Promise<Badge[]> {
  try {
    const { data, error } = await supabase
      .from("user_badges")
      .select("*")
      .eq("user_id", userId)
      .order("earned_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Failed to fetch badges:", error);
    return [];
  }
}