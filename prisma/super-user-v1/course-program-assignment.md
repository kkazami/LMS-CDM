Class program assignment
========================

Administrators use `/{institute}/admin/courses`, filter by instructor, choose a
program, then click **Save program**. The same optional Program selector is in
Create Course and Edit Course. Instructors also select a program directly in
Create a New Class and Edit Class Details, above the weekly schedule. Options come from active institute programs;
no programs or class mappings are created automatically. Section names do not
determine the mapping. The standalone save changes only `Course.programId`.

Database deployment
-------------------

Existing databases with the qualified super-user boundary and consolidated
Administrator role need `course-program-assignment.sql` applied by the database
owner. It replaces the course mapping trigger function and adds the narrow
`super_user_security.set_course_program(text,text,text,text)` operation. Execute
grants go only to enabled APPLICATION principals in the existing writer bindings.
It does not provision principals or change account, enrollment, or course data.

Fresh boundary installations include this file through
`scripts/install-super-user-boundary.mjs`. Deploy the SQL before using the new
controls. This setup changes database functions and grants only; it does not
remap classes or change instructors or enrollments.

The operation rechecks the session and institute in PostgreSQL. Administrators
manage their institute; instructors can change only classes they teach. It
consumes a private transaction-bound permit, and writes its audit atomically.
Ordinary runtime SQL still cannot mint program authority or bypass the mapping
guard. Program membership and Program Head designations remain separate controls.
