# Generator Dynamic Directive & Debugging Instruction

> **Current Sprint:** SPRINT-COURSE-PARITY  
> **Current Iteration:** 6 / 15  
> **Last Evaluator Score:** 100 / 100  
> **Target Status:** Completed  

---

## 1. Active Task Objective
Eliminate all hollow placeholders from the native mobile course screen (`[courseId].tsx`) and provide complete 1-to-1 parity with the web dashboard by implementing real Prisma-backed APIs and a 4-tab interactive UI (Stream, Classwork, People, Grades).

---

## 2. Parity & Performance Standards
1. **Real Data Backed:** 100% of course stream, syllabus classwork, student submissions, people roster, and grade scores are fetched from real database endpoints.
2. **Ergonomic Safety:** Inputs maintain 16px font size on mobile to prevent iOS Safari auto-zoom. Interactive buttons and tabs maintain `>= 44×44px` touch targets.
3. **Interactive Submissions:** Classwork modal allows turning in assignments and attaching submission links.
4. **Rich Gradient Aesthetics:** Hero banner utilizes `LinearGradient` matched to institute theme palette.

---

## 3. Strict Monorepo Constraints
- **Zero Placeholders:** No wireframe stubs or placeholder text.
- **Strict Typing:** All data models and SDK methods must be strictly typed.
