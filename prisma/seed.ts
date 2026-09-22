import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding default institutes...");

  const institutes = [
    { code: "ics", name: "Institute of Computer Studies" },
    { code: "ibe", name: "Institute of Business and Education" },
    { code: "ite", name: "Institute of Technology and Engineering" },
  ];

  for (const inst of institutes) {
    await prisma.institute.upsert({
      where: { code: inst.code },
      update: { name: inst.name },
      create: { code: inst.code, name: inst.name },
    });
  }

  console.log("Seeding default accounts (Admin, Instructor, Student) for all institutes...");
  const defaultPassword = await hash("password123", 10);

  const allInstitutes = await prisma.institute.findMany();
  const users = [];

  for (const inst of allInstitutes) {
    const code = inst.code.toLowerCase();
    
    let instructorName = "Professor Smith";
    let studentName = "Alex Student";
    
    if (code === "ibe") {
        instructorName = "Professor Keynes";
        studentName = "Bella Student";
    } else if (code === "ite") {
        instructorName = "Professor Turing";
        studentName = "Terry Student";
    }

    users.push(
      {
        name: `${code.toUpperCase()} System Admin`,
        email: `admin@${code}.edu.ph`,
        password: defaultPassword,
        role: "ADMIN",
        instituteId: inst.id,
      },
      {
        name: instructorName,
        email: `instructor@${code}.edu.ph`,
        password: defaultPassword,
        role: "PROFESSOR",
        instituteId: inst.id,
      },
      {
        name: studentName,
        email: `student@${code}.edu.ph`,
        studentNumber: `2026-${code}-001`,
        password: defaultPassword,
        role: "STUDENT",
        instituteId: inst.id,
      }
    );
  }

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, name: u.name, instituteId: u.instituteId },
      create: u,
    });
  }

  console.log("Seeding Knowledge Exchange 24 tags...");
  const kxTags = [
    // CPE (6 tags)
    { name: "Embedded Systems", slug: "embedded-systems", description: "Microcontrollers, ARM, AVR, IoT systems", category: "CPE" },
    { name: "Computer Architecture", slug: "computer-architecture", description: "CPU design, pipelines, instruction sets", category: "CPE" },
    { name: "Digital Logic Design", slug: "digital-logic", description: "Boolean algebra, FPGA, Verilog, VHDL", category: "CPE" },
    { name: "Robotics & Mechatronics", slug: "robotics", description: "Actuators, sensors, ROS, kinematics", category: "CPE" },
    { name: "Microprocessors", slug: "microprocessors", description: "Assembly, 8086, peripheral interfacing", category: "CPE" },
    { name: "Signals & Systems", slug: "signals-systems", description: "DSP, transforms, filtering", category: "CPE" },
    // IT (6 tags)
    { name: "Web Development", slug: "web-dev", description: "Frontend, backend, fullstack development", category: "IT" },
    { name: "Cloud Computing", slug: "cloud-computing", description: "AWS, GCP, Azure, serverless", category: "IT" },
    { name: "Database Management", slug: "databases", description: "SQL, NoSQL, query optimization, schemas", category: "IT" },
    { name: "Cybersecurity", slug: "cybersecurity", description: "Network security, cryptography, penetration testing", category: "IT" },
    { name: "Network Administration", slug: "networking", description: "TCP/IP, routing, switching, protocols", category: "IT" },
    { name: "Mobile App Development", slug: "mobile-dev", description: "React Native, Flutter, Android, iOS", category: "IT" },
    // TOPIC / GENERAL (12 tags)
    { name: "Data Structures & Algorithms", slug: "dsa", description: "Arrays, trees, graphs, sorting, big-O complexity", category: "TOPIC" },
    { name: "Object-Oriented Programming", slug: "oop", description: "Java, C++, OOP principles, design patterns", category: "TOPIC" },
    { name: "Operating Systems", slug: "operating-systems", description: "Processes, threads, memory management, Linux", category: "TOPIC" },
    { name: "Software Engineering", slug: "software-engineering", description: "Agile, SDLC, Git, testing, architecture", category: "TOPIC" },
    { name: "Artificial Intelligence", slug: "artificial-intelligence", description: "ML, neural networks, computer vision, NLP", category: "TOPIC" },
    { name: "Python Programming", slug: "python", description: "Data science, scripting, automation", category: "TOPIC" },
    { name: "C / C++ Programming", slug: "c-cpp", description: "Pointers, memory management, systems programming", category: "TOPIC" },
    { name: "Discrete Mathematics", slug: "discrete-math", description: "Logic, set theory, combinatorics, graph theory", category: "TOPIC" },
    { name: "Project Management", slug: "project-management", description: "Capstone, planning, requirements, documentation", category: "GENERAL" },
    { name: "UI/UX Design", slug: "ui-ux", description: "Figma, wireframes, user research, accessibility", category: "GENERAL" },
    { name: "Academic Advice", slug: "academic-advice", description: "Study tips, prerequisites, course sequencing", category: "GENERAL" },
    { name: "Career & Internship", slug: "career-internship", description: "Job preparation, resume reviews, technical interviews", category: "GENERAL" },
  ];

  for (const tag of kxTags) {
    await prisma.kxTag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name, description: tag.description, category: tag.category },
      create: tag,
    });
  }

  console.log("Seeding sample ICS courses and Knowledge Exchange posts...");
  const icsInstitute = await prisma.institute.findUnique({ where: { code: "ics" } });
  const icsStudent = await prisma.user.findUnique({ where: { email: "student@ics.edu.ph" } });
  const icsInstructor = await prisma.user.findUnique({ where: { email: "instructor@ics.edu.ph" } });

  if (icsInstitute && icsStudent && icsInstructor) {
    // Ensure an ICS course exists
    const icsCourse = await prisma.course.upsert({
      where: { courseCode: "CS101" },
      update: {},
      create: {
        code: "CS101",
        courseCode: "CS101",
        title: "Introduction to Computer Science & Algorithms",
        subject: "Computer Science",
        section: "BSCS-1A",
        description: "Foundations of computation, problem solving, and basic algorithms.",
        instructorId: icsInstructor.id,
        instituteId: icsInstitute.id,
      },
    });

    // Ensure student is enrolled
    await prisma.enrollment.upsert({
      where: {
        courseId_studentId: {
          courseId: icsCourse.id,
          studentId: icsStudent.id,
        },
      },
      update: { status: "APPROVED" },
      create: {
        courseId: icsCourse.id,
        studentId: icsStudent.id,
        status: "APPROVED",
      },
    });

    // Ensure a quiz syllabus item exists for assessment guardrail testing
    const quizSyllabusItem = await prisma.syllabusItem.findFirst({
      where: { courseId: icsCourse.id, type: "QUIZ" },
    });

    let activeQuizId = quizSyllabusItem?.id;
    if (!activeQuizId) {
      const createdQuiz = await prisma.syllabusItem.create({
        data: {
          courseId: icsCourse.id,
          type: "QUIZ",
          title: "Midterm Assessment - Algorithms & Data Structures",
          description: "Comprehensive timed quiz covering asymptotic analysis and recursion.",
          maxPoints: 100,
          enableIntegrityMonitoring: true,
          requireFullscreen: true,
        },
      });
      activeQuizId = createdQuiz.id;
    }

    // Seed Sample Post 1: Question with math LaTeX and code
    const post1Exists = await prisma.kxPost.findFirst({
      where: { title: "How does time complexity differ between BFS and DFS on an adjacency list?" },
    });

    if (!post1Exists) {
      const dsaTag = await prisma.kxTag.findUnique({ where: { slug: "dsa" } });
      const pythonTag = await prisma.kxTag.findUnique({ where: { slug: "python" } });

      const post1 = await prisma.kxPost.create({
        data: {
          title: "How does time complexity differ between BFS and DFS on an adjacency list?",
          body: "When implementing Breadth-First Search (BFS) and Depth-First Search (DFS) on a graph $G = (V, E)$, how do memory and time bounds compare? Here is a basic traversal:\n\n```python\ndef bfs(graph, start):\n    visited = set()\n    queue = [start]\n    while queue:\n        node = queue.pop(0)\n        if node not in visited:\n            visited.add(node)\n            queue.extend(graph[node] - visited)\n    return visited\n```\n\nIs the time complexity always $\\mathcal{O}(|V| + |E|)$?",
          postType: "QUESTION",
          status: "ANSWERED",
          isAnonymous: false,
          authorId: icsStudent.id,
          instituteId: icsInstitute.id,
          courseId: icsCourse.id,
          viewCount: 42,
          voteCount: 5,
          answerCount: 1,
        },
      });

      if (dsaTag) {
        await prisma.kxPostTag.create({ data: { postId: post1.id, tagId: dsaTag.id } });
        await prisma.kxTag.update({ where: { id: dsaTag.id }, data: { postCount: { increment: 1 } } });
      }
      if (pythonTag) {
        await prisma.kxPostTag.create({ data: { postId: post1.id, tagId: pythonTag.id } });
        await prisma.kxTag.update({ where: { id: pythonTag.id }, data: { postCount: { increment: 1 } } });
      }

      // Seed an accepted and instructor-verified answer
      await prisma.kxAnswer.create({
        data: {
          postId: post1.id,
          authorId: icsInstructor.id,
          body: "Yes! For an adjacency list representation, both BFS and DFS visit every vertex once and examine every edge once, yielding a time complexity of $\\mathcal{O}(|V| + |E|)$. The primary difference lies in space complexity: BFS requires $\\mathcal{O}(w)$ where $w$ is the maximum width of the tree, whereas DFS requires $\\mathcal{O}(h)$ where $h$ is maximum depth.",
          isAccepted: true,
          isVerified: true,
          verifiedById: icsInstructor.id,
          voteCount: 8,
        },
      });
    }

    // Seed Sample Post 2: Anonymous Question
    const post2Exists = await prisma.kxPost.findFirst({
      where: { title: "Understanding virtual memory paging and page faults in modern OS" },
    });

    if (!post2Exists) {
      const osTag = await prisma.kxTag.findUnique({ where: { slug: "operating-systems" } });
      const archTag = await prisma.kxTag.findUnique({ where: { slug: "computer-architecture" } });

      const post2 = await prisma.kxPost.create({
        data: {
          title: "Understanding virtual memory paging and page faults in modern OS",
          body: "Can someone walk through the exact hardware and software steps when an MMU encounters a page fault? What interrupt handler gets invoked by the CPU?",
          postType: "QUESTION",
          status: "OPEN",
          isAnonymous: true,
          authorId: icsStudent.id,
          instituteId: icsInstitute.id,
          viewCount: 18,
          voteCount: 3,
          answerCount: 0,
        },
      });

      if (osTag) {
        await prisma.kxPostTag.create({ data: { postId: post2.id, tagId: osTag.id } });
        await prisma.kxTag.update({ where: { id: osTag.id }, data: { postCount: { increment: 1 } } });
      }
      if (archTag) {
        await prisma.kxPostTag.create({ data: { postId: post2.id, tagId: archTag.id } });
        await prisma.kxTag.update({ where: { id: archTag.id }, data: { postCount: { increment: 1 } } });
      }
    }

    // Seed Sample Post 3: Assessment Guardrail Question linked to quiz
    const post3Exists = await prisma.kxPost.findFirst({
      where: { title: "Midterm Review: Solving recurrence relations with Master Theorem" },
    });

    if (!post3Exists) {
      const dsaTag = await prisma.kxTag.findUnique({ where: { slug: "dsa" } });
      const mathTag = await prisma.kxTag.findUnique({ where: { slug: "discrete-math" } });

      const post3 = await prisma.kxPost.create({
        data: {
          title: "Midterm Review: Solving recurrence relations with Master Theorem",
          body: "When analyzing $T(n) = 2T(n/2) + \\Theta(n)$, how does Case 2 of the Master Theorem apply? Note: This discussion is for study review.",
          postType: "QUESTION",
          status: "OPEN",
          isAnonymous: false,
          authorId: icsStudent.id,
          instituteId: icsInstitute.id,
          courseId: icsCourse.id,
          syllabusItemId: activeQuizId,
          viewCount: 25,
          voteCount: 4,
          answerCount: 0,
        },
      });

      if (dsaTag) {
        await prisma.kxPostTag.create({ data: { postId: post3.id, tagId: dsaTag.id } });
        await prisma.kxTag.update({ where: { id: dsaTag.id }, data: { postCount: { increment: 1 } } });
      }
      if (mathTag) {
        await prisma.kxPostTag.create({ data: { postId: post3.id, tagId: mathTag.id } });
        await prisma.kxTag.update({ where: { id: mathTag.id }, data: { postCount: { increment: 1 } } });
      }
    }
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
