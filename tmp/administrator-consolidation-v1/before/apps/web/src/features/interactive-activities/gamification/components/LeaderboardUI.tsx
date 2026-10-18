"use client";

import React from "react";
import { Trophy, Medal } from "lucide-react";

interface Ranking {
  studentId: string;
  displayName: string;
  points: number;
}

interface LeaderboardUIProps {
  rankingsJson: string; // From ActivityLeaderboardCache
  currentStudentId: string;
}

export function LeaderboardUI({ rankingsJson, currentStudentId }: LeaderboardUIProps) {
  let rankings: Ranking[] = [];
  try {
    rankings = JSON.parse(rankingsJson);
  } catch (e) {
    console.error("Failed to parse leaderboard rankings", e);
  }

  if (rankings.length === 0) {
    return (
      <div className="p-6 bg-white rounded-xl border border-gray-200 text-center text-gray-500">
        No activity on the leaderboard yet. Be the first to score!
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-gray-900">Class Leaderboard</h3>
      </div>
      
      <div className="divide-y divide-gray-100">
        {rankings.map((rank, idx) => {
          const isCurrentUser = rank.studentId === currentStudentId;
          
          return (
            <div 
              key={rank.studentId} 
              className={`flex items-center p-4 transition-colors ${isCurrentUser ? 'bg-indigo-50/50' : 'hover:bg-gray-50'}`}
            >
              <div className="w-8 text-center font-bold text-gray-400 mr-4">
                {idx === 0 ? <Medal className="w-6 h-6 text-amber-400 mx-auto" /> : 
                 idx === 1 ? <Medal className="w-6 h-6 text-gray-400 mx-auto" /> : 
                 idx === 2 ? <Medal className="w-6 h-6 text-amber-700 mx-auto" /> : 
                 `#${idx + 1}`}
              </div>
              
              <div className="flex-1">
                <div className={`font-semibold ${isCurrentUser ? 'text-indigo-900' : 'text-gray-900'}`}>
                  {rank.displayName}
                  {isCurrentUser && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">You</span>}
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-indigo-600">{rank.points}</div>
                <div className="text-xs text-gray-500 uppercase">pts</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
