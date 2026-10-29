# Guided practical lab starters

ICS instructors can choose core practical labs (MySQL, Ubuntu VM installation, isolated router interface setup, RJ45 patch-cable assembly, or supervised fiber-optic connector termination) and Microsoft Windows Server labs from the course lab builder. Choosing a starter copies its definition into an instructor-owned draft. The instructor can edit, preview, save, publish the instructions, then assign them through existing Classwork. Nothing is automatically published or assigned to students. The example content requires local tools and evidence; the LMS does not run commands or connect to equipment.

These starters are source-defined in `apps/web/src/lib/labs/presets.ts`; the builder choices live in `preset-catalog.ts`. They need no new database migration. If the provider database is unavailable, instructors cannot log in or save a starter yet. Keep this code ready and verify a real instructor-to-student workflow when access returns.

## Microsoft Windows Server sequence

Definitions live in `apps/web/src/lib/labs/windows-server.ts` and target instructor-approved Windows Server 2022 or 2025 training VMs. Each supports the existing checklist, short-answer, evidence, correction, and grading workflow. Server Manager guidance and student-run PowerShell examples are included. Server Core users use SConfig where appropriate.

1. **Initial settings:** unique server name, restart, assigned static IPv4/prefix/DNS settings, Windows Update mode/status and restart plan. Use console access during changes. A default gateway is needed only when the assigned lab network provides one.
2. **AD DS and DNS:** install the role, then separately promote the prepared VM into a new isolated forest. Keep DSRM credentials private. Verify the domain, DNS zone, and LDAP SRV records after restart. Use internal AD DNS for domain resolution.
3. **DHCP:** use a prepared domain member with a static address and a private lab switch. Complete post-installation domain authorization, create an inactive scope, review the range/exclusions/options, then activate only after the instructor checks isolation. Verify a client lease and DNS result. Never bridge this DHCP service onto a real LAN.
4. **Backup and recovery:** install Windows Server Backup from Features, back up only sample files to a separate approved volume, recover to a different folder, and compare SHA-256 hashes. This exercise does not establish a full-server or AD forest recovery plan. It can run without AD DS.

Instructors must adjust the address plan, domain, adapter, backup destination, permissions, and update source for the actual classroom. Examples do not disable security controls, embed passwords, or run on the LMS host. Local PostgreSQL tests validate draft creation and access controls; they do not prove these procedures have been run on Windows Server VMs. That equipment demonstration remains part of classroom acceptance.

Before publishing, the instructor should check the exact equipment, interface and address plan, connector kit, installer target, time allowance, and evidence instructions for the class. The router example uses Cisco IOS-style syntax and an IANA documentation address. Replace both with the assigned lab values. RJ45 uses a straight-through cable with the same instructor-selected T568 scheme at both ends. Fiber termination methods vary by kit: a fiber connector is not assembled with the universal RJ45 crimp procedure, and the exercise requires supervised non-live training fiber. Ubuntu installation targets a disposable VM disk, never a student's host disk.

Technical references used to prepare the examples:

- [Cisco IOS IPv4 interface configuration](https://www.cisco.com/c/en/us/td/docs/routers/ios-xe/ip-addressing/ip-addressing/m_config-ipv4-addr-0.html)
- [IANA special-purpose IPv4 registry](https://www.iana.org/assignments/iana-ipv4-special-registry)
- [Fluke Networks T568A and T568B wiring](https://www.flukenetworks.com/knowledge-base/application-or-standards-articles-copper/differences-between-wiring-codes-t568a-vs)
- [Fluke Networks wire-map testing](https://www.flukenetworks.com/blog/cabling-chronicles/wire-map-testing-it-s-not-all-about-color)
- [FOA fiber inspection and cleaning standard](https://thefoa.org/tech/ref/1pstandards/FOA-8.pdf)
- [FOA fiber safety reference](https://www.thefoa.org/tech/ref/safety/safe.html)
- [Ubuntu Desktop installation guide](https://ubuntu.com/tutorials/install-ubuntu-desktop)
- [Microsoft SConfig and initial configuration](https://learn.microsoft.com/en-us/windows-server/administration/server-core/server-core-sconfig)
- [Microsoft New-NetIPAddress reference](https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress)
- [Microsoft AD DS installation](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/deploy/install-active-directory-domain-services--level-100-)
- [Microsoft Install-ADDSForest reference](https://learn.microsoft.com/en-us/powershell/module/addsdeployment/install-addsforest)
- [Microsoft DNS installation and configuration](https://learn.microsoft.com/en-us/windows-server/networking/dns/quickstart-install-configure-dns-server)
- [Microsoft DHCP installation and configuration](https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/quickstart-install-configure-dhcp-server)
- [Microsoft Windows Server Backup feature](https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/forest-recovery-guide/ad-forest-recovery-backing-up-a-full-server)
- [Microsoft backup recovery reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/wbadmin-start-recovery)
