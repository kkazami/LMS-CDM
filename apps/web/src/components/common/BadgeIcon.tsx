"use client";

import {
  Send,
  Terminal,
  Trophy,
  Globe,
  Code2,
  BookCheck,
  Layers,
  GraduationCap,
  Zap,
  CalendarCheck,
  Flame,
  CalendarDays,
  Sunrise,
  Moon,
  Star,
  Award,
  CheckCircle2,
  Shield,
  Diamond,
  Gem,
  Crown,
  PartyPopper,
  UserCheck,
  Camera,
  Lock,
  Medal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

interface BadgeIconProps {
  name: string;
  className?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Send,
  Terminal,
  Trophy,
  Globe,
  Code2,
  BookCheck,
  Layers,
  GraduationCap,
  Zap,
  CalendarCheck,
  Flame,
  CalendarDays,
  Sunrise,
  Moon,
  Star,
  Award,
  CheckCircle2,
  Shield,
  Diamond,
  Gem,
  Crown,
  PartyPopper,
  UserCheck,
  Camera,
  Lock,
  Medal,
  Sparkles,
};

export default function BadgeIcon({ name, className = "w-5 h-5" }: BadgeIconProps) {
  const IconComponent = ICON_MAP[name] || Award;
  return <IconComponent className={className} />;
}
