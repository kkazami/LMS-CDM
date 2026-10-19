"use client";

import React from "react";
import { Zap, Award, Power, Terminal, ShieldAlert } from "lucide-react";
import { BADGE_RULES } from "../badges";

interface GamificationDashboardProps {
  profile: any; // Using any for UI prototype, normally type GamificationProfile
  earnedBadgeIds: string[];
}

const ICONS: Record<string, any> = {
  Zap, Award, Power, Terminal
};

export function GamificationDashboard({ profile, earnedBadgeIds }: GamificationDashboardProps) {
  
  if (!profile) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200 text-center text-gray-500">
        You haven't participated in any interactive activities yet. Run your first simulation to start earning points!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl text-white shadow">
          <div className="text-indigo-100 text-sm font-bold uppercase tracking-wider mb-2">Total Points</div>
          <div className="text-4xl font-extrabold">{profile.totalPoints}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-500 p-6 rounded-xl text-white shadow">
          <div className="text-orange-100 text-sm font-bold uppercase tracking-wider mb-2">Current Streak</div>
          <div className="flex items-end gap-2">
            <div className="text-4xl font-extrabold">{profile.currentStreak}</div>
            <div className="text-orange-200 mb-1">Days</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <div className="text-gray-500 text-sm font-bold uppercase tracking-wider mb-1">Privacy Setting</div>
          <div className="flex items-center gap-2 mt-2">
            {profile.isLeaderboardAnonymized ? (
              <>
                <ShieldAlert className="text-amber-500 w-5 h-5" />
                <span className="text-gray-700 font-medium">Anonymized on Leaderboards</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <span className="text-gray-700 font-medium">Publicly Visible</span>
              </>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2">Toggle this in your account settings.</p>
        </div>
      </div>

      {/* Badge Shelf */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-3 mb-4">Your Badge Shelf</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BADGE_RULES.map(rule => {
            const isEarned = earnedBadgeIds.includes(rule.id);
            const Icon = ICONS[rule.icon] || Award;
            
            return (
              <div 
                key={rule.id} 
                className={`p-4 rounded-xl border flex flex-col items-center text-center transition-all ${isEarned ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-50 grayscale'}`}
              >
                <div className={`p-3 rounded-full mb-3 ${isEarned ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="font-bold text-gray-900 text-sm mb-1">{rule.name}</div>
                <div className="text-xs text-gray-500">{rule.description}</div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
