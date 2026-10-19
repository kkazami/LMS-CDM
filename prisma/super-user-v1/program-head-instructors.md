Program Head instructor membership
==================================

In Organizational Chart, current Program Heads use **Add instructor** in the
People & classes header to search existing active ICS instructors and add them
to the selected program. Membership appears in the main chart immediately and
persists on refresh. Creating accounts and changing Program Head designations
remain administrator operations. Adding membership does not reassign courses,
change course programs, change roles, or enroll students.

The additive `program-head-instructors.sql` installs
`super_user_security.add_program_instructor(text,text,text,text,integer)` and
grants it only to enabled application writer principals. Existing databases
must apply it as the owner after the consolidated Administrator boundary is
installed. Fresh boundary installations include it automatically.

The function revalidates the session, institute, active program, current head
designation and target eligibility inside the database. A stale chart version
or duplicate membership fails without writes. A single-use private permit lets
the existing guard accept only the intended membership change. The version and
audit entry commit atomically. Reactivating a membership with a current head
designation requires administrator review, so this operation cannot promote
another Program Head.

Applying the setup changes no membership or academic data. For recovery, revoke
the runtime execute grant and drop only this new function; the application
should first be reverted to hide its Add instructor control. Existing members
added through the feature should remain intact unless separately reviewed.
