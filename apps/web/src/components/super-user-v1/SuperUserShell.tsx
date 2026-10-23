'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import { BookOpen, ChevronDown, GraduationCap, LayoutDashboard, LogOut, Moon, ShieldCheck, Sun, Users } from 'lucide-react';
import UserAvatar from '@/components/common/UserAvatar';
import { getInstituteTheme } from '@/lib/get-institute-theme';
import { ThemeProvider, useTheme } from '@/lib/theme-context';
import { SUPPORTED_INSTITUTES } from '@/lib/super-user-v1/capabilities';
import styles from './super-user.module.css';

type Props = { institute: string; userName: string; children: React.ReactNode };

export default function SuperUserShell(props: Props) {
  return <ThemeProvider><Workspace {...props} /></ThemeProvider>;
}

function Workspace({ institute, userName, children }: Props) {
  const pathname = usePathname();
  const theme = getInstituteTheme(institute);
  const { themeMode, toggleTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const base = `/${institute}/academic-operations`;
  const section = pathname.includes('/institute-admins') ? '/institute-admins' : pathname.includes('/courses') ? '/courses' : '';
  const links = [
    { label: 'Overview', path: '', icon: LayoutDashboard },
    { label: 'Courses', path: '/courses', icon: BookOpen },
    { label: 'Administrators', path: '/institute-admins', icon: Users },
  ];
  async function signOut() {
    setSigningOut(true); setLogoutError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('logout');
      window.location.assign(`/login?institute=${institute}&force=true`);
    } catch { setSigningOut(false); setLogoutError('Could not sign out. Try again.'); }
  }
  const navigation = links.map(({ label, path, icon: Icon }) => <Link key={label} href={`${base}${path}`} className={styles.navLink} aria-current={section === path ? 'page' : undefined}><Icon size={18} aria-hidden="true" /><span>{label}</span></Link>);

  return <div data-institute={institute.toLowerCase()} className={styles.workspace} style={{ '--su-accent': theme.colors.primary, '--su-on-accent': institute === 'ite' ? '#fff' : '#161616', '--focus-ring': theme.colors.primary } as CSSProperties}>
    <a className={styles.skipLink} href="#super-user-content">Skip to content</a>
    <aside className={styles.sidebar}>
      <Link href={base} className={styles.brand}><GraduationCap size={30} aria-hidden="true" /><span>CdM LMS<small>Super User</small></span></Link>
      <div className={styles.sidebarInstitute}><span className={styles.instituteMark}>{institute.toUpperCase()}</span><p>{theme.name}</p></div>
      <nav aria-label="Super User" className={styles.navigation}>{navigation}</nav>
      <div className={styles.sidebarFoot}><ShieldCheck size={20} aria-hidden="true" /><p>Super User access<span>Review courses and manage institute administrators.</span></p></div>
    </aside>
    <div className={styles.workspaceBody}>
      <header className={styles.topbar}>
        <div className={styles.topbarTitle}><span>Super User · {institute.toUpperCase()}</span><small>{theme.name}</small></div>
        <div className={styles.topbarActions}>
          <label className={styles.instituteSelect}><span className={styles.srOnly}>Switch institute</span><select value={institute} onChange={event => window.location.assign(`/${event.target.value}/academic-operations${section}`)}>{SUPPORTED_INSTITUTES.map(code => <option value={code} key={code}>{code.toUpperCase()}</option>)}</select><ChevronDown size={14} aria-hidden="true" /></label>
          <button type="button" className={styles.iconButton} aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`} onClick={toggleTheme}>{themeMode === 'light' ? <Moon size={19} /> : <Sun size={19} />}</button>
          <details className={styles.profile} key={pathname}>
            <summary aria-label="Your account"><UserAvatar name={userName} color={theme.colors.sidebar} size="sm" /><span className={styles.profileName}>{userName}</span><ChevronDown size={14} aria-hidden="true" /></summary>
            <div className={styles.profileMenu}><strong>{userName}</strong><p>Super User</p><button type="button" onClick={() => void signOut()} disabled={signingOut}><LogOut size={16} aria-hidden="true" />{signingOut ? 'Signing out…' : 'Sign out'}</button>{logoutError && <p role="alert">{logoutError}</p>}</div>
          </details>
        </div>
      </header>
      <nav aria-label="Super User mobile" className={styles.mobileNav}>{navigation}</nav>
      <main id="super-user-content" className={styles.main} tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
