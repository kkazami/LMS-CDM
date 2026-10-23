import { BookOpen, Award, Settings, User, Monitor, LucideIcon } from "lucide-react";

export type FAQ = {
  question: string;
  answer: string;
};

export type FAQCategory = {
  title: string;
  icon: LucideIcon;
  faqs: FAQ[];
};

export const studentFaqs: FAQCategory[] = [
  {
    title: "Academic & Courses",
    icon: BookOpen,
    faqs: [
      { question: "How do I submit an assignment?", answer: "Go to your course dashboard, select the assignment from the Syllabus tab, and click 'Submit Work'. You can attach files or paste links." },
      { question: "Where can I see my grades?", answer: "Your grades are visible on the 'Grades' tab within each course." },
      { question: "How do I join a student group?", answer: "Groups are formed by your instructor. If you've been added to a group, it will appear on your course dashboard." },
    ],
  },
  {
    title: "Gamification & EXP",
    icon: Award,
    faqs: [
      { question: "How do I earn EXP?", answer: "EXP is earned by completing assignments, maintaining daily login streaks, earning badges, and participating in CodLab activities." },
      { question: "What are the level tiers?", answer: "Tiers range from Newcomer (Level 1) up to Legend, unlocking new profile badges and perks." },
      { question: "How does the login streak work?", answer: "Log in consecutively every day to increase your streak multiplier, which grants bonus EXP." },
    ],
  },
];

export const instructorFaqs: FAQCategory[] = [
  {
    title: "Course Management",
    icon: Settings,
    faqs: [
      { question: "How do I create an assignment?", answer: "In your course dashboard, navigate to the 'Syllabus' tab and click 'Create Item'. Choose 'Assignment' and fill in the details." },
      { question: "How do I grade student submissions?", answer: "Open the assignment, click on 'Submissions', and you can review and grade each student's work individually." },
      { question: "How do I broadcast a notification to all students?", answer: "Use the 'Announcements' feature or send a direct broadcast notification from the course settings." },
    ],
  },
  {
    title: "Gamification & Incentives",
    icon: Award,
    faqs: [
      { question: "How do I set up a Grade Incentive?", answer: "Go to Course Settings > Gamification, and you can define rules like 'Perfect Score Bonus' to automatically reward students." },
      { question: "Can I customize badges?", answer: "Currently, badges are system-wide, but you can create specific course milestones that trigger EXP rewards." },
    ],
  },
];

export const generalFaqs: FAQCategory[] = [
  {
    title: "Account & Security",
    icon: User,
    faqs: [
      { question: "How do I reset my password?", answer: "Click 'Forgot Password' on the login screen, or go to Account Settings > Security to change it." },
      { question: "How do I revoke an active session?", answer: "Visit the Privacy Settings page to view and revoke any active sessions." },
      { question: "How do I change my avatar?", answer: "Click your profile picture in the top right, select 'Profile', and then click on your avatar to upload a new one." },
    ],
  },
  {
    title: "Technical Support",
    icon: Monitor,
    faqs: [
      { question: "The 3D Module isn't loading.", answer: "Make sure you are using a modern browser (Chrome, Edge, Firefox) and hardware acceleration is enabled." },
      { question: "I'm experiencing lag.", answer: "Try closing other heavy tabs or applications. Ensure you have a stable internet connection." },
    ],
  },
];

export const adminFaqs: FAQCategory[] = [
  {
    title: "System Administration",
    icon: Settings,
    faqs: [
      { question: "How do I create a new user?", answer: "Go to the Admin Dashboard > Users tab, and click 'Create User'. You can assign them as a Student, Instructor, or Admin, and assign their campus." },
      { question: "How do I manage institute campuses?", answer: "Currently, campuses (ICS, IBE, ITE) are hardcoded in the configuration, but you can switch your active campus view using the top navigation bar." },
      { question: "Can I view all courses across the platform?", answer: "Yes, as an Admin you have global read access to all courses, though you cannot directly edit course content unless you are added as an instructor." },
    ],
  },
  {
    title: "Roles & Permissions",
    icon: User,
    faqs: [
      { question: "What is the difference between an Admin and an Instructor?", answer: "Admins can manage platform-wide settings and all users. Instructors are limited to creating and grading courses for their own students." },
      { question: "How do I revoke a user's access?", answer: "In the Users list, click the ellipsis (...) next to their name and select 'Deactivate Account'." },
    ],
  },
];

export const getFaqsForRole = (role: string) => {
  const roleFaqs = 
    role === "ADMIN" ? adminFaqs :
    role === "STUDENT" ? studentFaqs : 
    instructorFaqs; // Default fallback for INSTRUCTOR/PROFESSOR
    
  return [...roleFaqs, ...generalFaqs];
};
