# LMS Domain Model

## Core Entities

### User
- id, email, password (bcrypt), name, role, studentNumber
- Roles: STUDENT, PROFESSOR, ADMIN
- Belongs to one Institute
- Has Sessions, Enrollments, Submissions

### Institute
- code (unique): ics, ibe, ite
- name, description, logo, theme (JSON), settings (JSON)
- Has Users, Courses, Enrollments

### Course
- title, code, description, credits, semester, status
- Belongs to Institute and Instructor (User)
- Has Sections, Enrollments

### Enrollment
- Links User + Course + Institute
- Has role and status

### Section > Module > Lesson
- Hierarchical content structure within courses
- Lesson has type and content (JSON)

### Assignment > Submission > Grade
- Assignment belongs to Course
- Submission belongs to Student + Assignment
- Grade links to Submission

### Session
- DB-backed auth session
- Links to User
- Has expiresAt

## Relationships
```
Institute 1—* User
Institute 1—* Course
User(Professor) 1—* Course
User 1—* Enrollment
Course 1—* Enrollment
Course 1—* Section 1—* Module 1—* Lesson
Course 1—* Assignment 1—* Submission
Submission 1—1 Grade
User 1—* Session
```

## Business Rules
- Students must have a student number in format XX-XXXXX
- One user belongs to one institute
- Login requires email + password, returns session cookie
- Sessions expire after 7 days
- Deactivated users cannot authenticate
- Institute code determines theme (ics=orange, ibe=gold, ite=blue)
