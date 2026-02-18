import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BADGE_INFO, type BadgeType } from "@/lib/badgeUtils";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeCardProps {
  badgeType: BadgeType;
  earned?: boolean;
  earnedAt?: string;
}

const BadgeCard = ({ badgeType, earned = false, earnedAt }: BadgeCardProps) => {
  const info = BADGE_INFO[badgeType];

  return (
    <Card className={cn(
      "transition-all hover:shadow-md",
      !earned && "opacity-60 bg-muted/50"
    )}>
      <CardContent className="p-4">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className={cn(
            "text-4xl mb-2 transition-all",
            !earned && "grayscale opacity-40"
          )}>
            {earned ? info.icon : <Lock className="h-10 w-10 text-muted-foreground" />}
          </div>
          <h3 className="font-semibold text-sm">{info.name}</h3>
          <p className="text-xs text-muted-foreground">{info.description}</p>
          {earned && earnedAt && (
            <Badge variant="secondary" className="text-xs">
              {new Date(earnedAt).toLocaleDateString()}
            </Badge>
          )}
          {!earned && (
            <Badge variant="outline" className="text-xs">
              Locked
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BadgeCard;