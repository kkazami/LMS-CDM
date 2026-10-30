import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Easing,
  BackHandler,
  PanResponder,
  Switch,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  LogOut,
  Moon,
  Sun,
  ChevronRight,
  Shield,
  ExternalLink,
  Video,
  Layers,
  CheckSquare,
  MessageSquare,
  Award,
  Code2,
  FlaskConical,
  Table,
  FileText,
  FolderDown,
  FileCheck,
  Network,
  BarChart2,
  Trophy,
} from 'lucide-react-native';
import { useAuthStore } from '../../stores/auth-store';
import { useThemeStore } from '../../stores/theme-store';
import { useTheme } from '../../hooks/useTheme';
import {
  getOnPrimaryColor,
  getInstituteGradients,
  useReducedMotion,
} from '../../lib/design-system';
import { getCanonicalInstituteName } from '../../lib/theme';
import { isIteUser, isIcsUser } from '../../lib/ite-eligibility';
import { getWebBaseUrl } from '../../lib/constants';
import { ProfileEditModal } from '../profile/ProfileEditModal';
import { IcsMoreMenu } from './IcsMoreMenu';

export interface MoreMenuContextType {
  isOpen: boolean;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

const MoreMenuContext = createContext<MoreMenuContextType>({
  isOpen: false,
  openMenu: () => {},
  closeMenu: () => {},
  toggleMenu: () => {},
});

export const useMoreMenu = () => useContext(MoreMenuContext);

interface MoreMenuDrawerProps {
  role: 'STUDENT' | 'TEACHER';
  children: React.ReactNode;
}

export function MoreMenuDrawer({ role, children }: MoreMenuDrawerProps) {
  const theme = useTheme();
  return theme.code === 'ics' ? <IcsMoreMenu role={role} context={MoreMenuContext}>{children}</IcsMoreMenu> : <LegacyMoreMenuDrawer role={role}>{children}</LegacyMoreMenuDrawer>;
}

function LegacyMoreMenuDrawer({ role, children }: MoreMenuDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const animProgress = useRef(new Animated.Value(0)).current;
  const isReducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const theme = useTheme();
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const gradients = getInstituteGradients(theme.colors.primary, isDark, user?.institute?.code);
  const onPrimary = getOnPrimaryColor(theme);
  const { width: screenWidth } = useWindowDimensions();

  // Keep labels readable on small phones and constrain the drawer on tablets.
  const visibleWidth = Math.min(360, Math.round(screenWidth * 0.82));

  // Consistent icon treatment: translucent tint of on-menu text color
  const menuTextColor = isDark ? '#FFFFFF' : onPrimary;
  const menuIconBg = isDark
    ? 'rgba(255, 255, 255, 0.12)'
    : onPrimary === '#111827'
    ? 'rgba(17, 24, 39, 0.10)'
    : 'rgba(255, 255, 255, 0.18)';
  const menuIconColor = isDark ? '#FFFFFF' : onPrimary;
  const menuSecondaryTextColor = isDark
    ? 'rgba(255, 255, 255, 0.65)'
    : onPrimary === '#111827'
    ? 'rgba(17, 24, 39, 0.70)'
    : 'rgba(255, 255, 255, 0.72)';

  // Sign Out Treatment: Guaranteed >= 4.5:1 contrast against what is behind it
  // - In light mode on bright backgrounds (ICS orange, IBE yellow), use dark solid chip (#111827) with high-contrast red text/icon
  // - On dark navy (ITE light #1B365D), use white solid chip (#FFFFFF) with deep red text/icon (#B91C1C)
  // - In dark mode, use solid red button (#DC2626) with crisp white text (#FFFFFF)
  const logoutTreatment = isDark
    ? {
        containerBg: '#DC2626',
        borderColor: '#DC2626',
        iconBg: 'rgba(255, 255, 255, 0.22)',
        iconColor: '#FFFFFF',
        textColor: '#FFFFFF',
      }
    : onPrimary === '#111827'
    ? {
        containerBg: '#111827',
        borderColor: '#374151',
        iconBg: 'rgba(239, 68, 68, 0.22)',
        iconColor: '#F87171',
        textColor: '#FCA5A5',
      }
    : {
        containerBg: '#FFFFFF',
        borderColor: '#FFFFFF',
        iconBg: 'rgba(185, 28, 28, 0.12)',
        iconColor: '#B91C1C',
        textColor: '#B91C1C',
      };

  const openMenu = useCallback(() => {
    setIsOpen(true);
    if (isReducedMotion) {
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animProgress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [animProgress, isReducedMotion]);

  const closeMenu = useCallback(() => {
    if (isReducedMotion) {
      Animated.timing(animProgress, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setIsOpen(false));
    } else {
      Animated.timing(animProgress, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => setIsOpen(false));
    }
  }, [animProgress, isReducedMotion]);

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isOpen, openMenu, closeMenu]);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (isOpen) {
        closeMenu();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isOpen, closeMenu]);

  // PanResponder to handle swiping left on the shrunken canvas to close
  const panResponder = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return isOpen && gestureState.dx < -15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -25) {
          closeMenu();
        }
      },
    }), [isOpen, closeMenu]);

  const handleNavigate = (route: string) => {
    closeMenu();
    setTimeout(() => {
      router.push(route as any);
    }, isReducedMotion ? 150 : 180);
  };

  const handleOpenWeb = async (subPath: string) => {
    closeMenu();
    try {
      const instituteCode = (user?.institute?.code || 'ics').toLowerCase();
      const baseUrl = getWebBaseUrl();
      const url = `${baseUrl}/${instituteCode}${subPath.startsWith('/') ? subPath : `/${subPath}`}`;
      const supported = await Linking.canOpenURL(url).catch(() => true);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Unable to Open Web Link', `Please open ${url} in your browser.`);
      }
    } catch {
      Alert.alert('Error', 'Unable to open the web link.');
    }
  };

  const handleLogout = () => {
    closeMenu();
    setTimeout(() => {
      Alert.alert('Sign Out', 'Are you sure you want to sign out of CdM LMS?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]);
    }, 300);
  };

  const getInitials = (name?: string) => {
    if (!name) return role === 'TEACHER' ? 'P' : 'S';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // Interpolated animation styles
  const canvasScale = isReducedMotion
    ? 1
    : animProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.96],
      });

  const canvasTranslateX = isReducedMotion
    ? 0
    : animProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, visibleWidth],
      });

  const canvasBorderRadius = isReducedMotion
    ? 0
    : animProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 28],
      });

  const canvasOpacity = isReducedMotion
    ? animProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.25],
      })
    : 1;

  const menuOpacity = animProgress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 0.6, 1],
  });

  const menuTranslateX = isReducedMotion
    ? 0
    : animProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-20, 0],
      });

  return (
    <MoreMenuContext.Provider value={{ isOpen, openMenu, closeMenu, toggleMenu }}>
      <View style={styles.root}>
        {/* ── Background Drawer Menu Layer (strictly constrained to visibleWidth) ── */}
        <Animated.View
          style={[
            styles.menuContainer,
            {
              width: visibleWidth,
              opacity: menuOpacity,
              transform: [{ translateX: menuTranslateX }],
            },
          ]}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <LinearGradient
            colors={gradients.menuGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.menuGradient,
              {
                width: visibleWidth,
                paddingTop: Math.max(insets.top, 16) + 4,
                paddingBottom: Math.max(insets.bottom, 16) + 8,
              },
            ]}
          >
            {/* Top Bar with Close (X) button on left, never covered */}
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={closeMenu}
                style={styles.closeButton}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close Menu"
              >
                <X size={18} color={menuTextColor} />
              </TouchableOpacity>
            </View>

            {/* Profile Header */}
            <TouchableOpacity
              style={styles.profileHeader}
              onPress={() => setShowProfileModal(true)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Edit Profile"
            >
              <View style={[styles.avatarCircle, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.avatarInitials, { color: onPrimary }]}>
                  {getInitials(user?.name)}
                </Text>
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.userName, { color: menuTextColor }]} numberOfLines={1}>
                  {role === 'TEACHER' ? `Prof. ${user?.name || 'Faculty'}` : user?.name || 'Student Account'}
                </Text>
                <Text style={[styles.userEmail, { color: menuSecondaryTextColor }]} numberOfLines={1}>
                  {user?.email}
                </Text>
                <View style={styles.badgeWrapper}>
                  <Text style={[styles.instituteBadgeText, { color: menuTextColor }]} numberOfLines={2}>
                    {getCanonicalInstituteName(user?.institute?.code, user?.institute?.name || theme.name)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Menu Items List - Fully Scrollable */}
            <ScrollView
              style={styles.menuScroll}
              contentContainerStyle={styles.menuScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.sectionLabel, { color: menuSecondaryTextColor }]}>ACADEMIC UTILITIES</Text>

              {role === 'STUDENT' ? (
                <>
                  <TouchableOpacity style={styles.menuRow} accessibilityRole="button" onPress={() => handleNavigate('/student/calendar')}><Text style={[styles.rowLabel, { color: menuTextColor }]}>Agenda and deadlines</Text><ChevronRight size={18} color={menuIconColor} /></TouchableOpacity>
                  {isIteUser(user) && (
                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={() => handleNavigate('/student/meetings')}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Class Meetings"
                    >
                      <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                        <Video size={16} color={menuIconColor} />
                      </View>
                      <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Class Meetings</Text>
                      <ChevronRight size={14} color={menuSecondaryTextColor} />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleNavigate('/student/flashcards')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Flashcards"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <Layers size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Flashcards</Text>
                    <ChevronRight size={14} color={menuSecondaryTextColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleNavigate('/student/tasks')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Workspace Planner"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <CheckSquare size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Workspace Planner</Text>
                    <ChevronRight size={14} color={menuSecondaryTextColor} />
                  </TouchableOpacity>

                  {isIcsUser(user) && (
                    <TouchableOpacity style={styles.menuRow} onPress={() => handleNavigate('/student/codelab')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="CodeLab">
                      <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}><Code2 size={16} color={menuIconColor} /></View>
                      <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>CodeLab</Text>
                      <ChevronRight size={14} color={menuSecondaryTextColor} />
                    </TouchableOpacity>
                  )}

                  {isIcsUser(user) && (
                    <TouchableOpacity style={styles.menuRow} onPress={() => handleNavigate('/student/practical-labs')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Practical Labs">
                      <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}><FlaskConical size={16} color={menuIconColor} /></View>
                      <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Practical Labs</Text>
                      <ChevronRight size={14} color={menuSecondaryTextColor} />
                    </TouchableOpacity>
                  )}

                  {isIcsUser(user) && (
                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={() => handleNavigate('/student/knowledge-exchange')}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Knowledge Exchange"
                    >
                      <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                        <MessageSquare size={16} color={menuIconColor} />
                      </View>
                      <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Knowledge Exchange</Text>
                      <ChevronRight size={14} color={menuSecondaryTextColor} />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleNavigate('/student/achievements')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Badges and Rewards"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <Award size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Badges & Rewards</Text>
                    <ChevronRight size={14} color={menuSecondaryTextColor} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {isIteUser(user) && (
                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={() => handleNavigate('/teacher/meetings')}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Class Meetings"
                    >
                      <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                        <Video size={16} color={menuIconColor} />
                      </View>
                      <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Class Meetings</Text>
                      <ChevronRight size={14} color={menuSecondaryTextColor} />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleNavigate('/teacher/(tabs)/courses')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Syllabus & Materials"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <FolderDown size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Syllabus & Materials</Text>
                    <ChevronRight size={14} color={menuSecondaryTextColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleNavigate('/teacher/(tabs)/courses')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Grading Queue"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <FileCheck size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Grading Queue</Text>
                    <ChevronRight size={14} color={menuSecondaryTextColor} />
                  </TouchableOpacity>

                  {isIcsUser(user) && (
                    <TouchableOpacity style={styles.menuRow} onPress={() => handleNavigate('/teacher/codelab')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="CodeLab">
                      <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}><Code2 size={16} color={menuIconColor} /></View>
                      <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>CodeLab</Text>
                      <ChevronRight size={14} color={menuSecondaryTextColor} />
                    </TouchableOpacity>
                  )}

                  {isIcsUser(user) && (
                    <TouchableOpacity style={styles.menuRow} onPress={() => handleNavigate('/teacher/practical-labs')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Practical Labs">
                      <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}><FlaskConical size={16} color={menuIconColor} /></View>
                      <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Practical Labs</Text>
                      <ChevronRight size={14} color={menuSecondaryTextColor} />
                    </TouchableOpacity>
                  )}

                  {isIcsUser(user) && (
                    <TouchableOpacity
                      style={styles.menuRow}
                      onPress={() => handleNavigate('/teacher/knowledge-exchange')}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Knowledge Exchange"
                    >
                      <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                        <MessageSquare size={16} color={menuIconColor} />
                      </View>
                      <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Knowledge Exchange</Text>
                      <ChevronRight size={14} color={menuSecondaryTextColor} />
                    </TouchableOpacity>
                  )}
                </>
              )}

              {role === 'TEACHER' && isIcsUser(user) && (
                <TouchableOpacity style={styles.menuRow} onPress={() => handleNavigate('/teacher/codelab?view=instructor')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="CodeLab Analytics">
                  <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}><BarChart2 size={16} color={menuIconColor} /></View>
                  <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>CodeLab Analytics</Text>
                  <ChevronRight size={14} color={menuSecondaryTextColor} />
                </TouchableOpacity>
              )}

              {/* More on the Web Section */}
              <Text style={[styles.sectionLabel, { color: menuSecondaryTextColor, marginTop: 14 }]}>MORE ON THE WEB</Text>

              {role === 'STUDENT' ? (
                <>


                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleOpenWeb('/grades')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Open Academic Gradebook on web"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <Table size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Full Academic Gradebook</Text>
                    <ExternalLink size={12} color={menuSecondaryTextColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleOpenWeb('/assignments')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Open Quizzes on web"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <FileText size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Quizzes & Forms</Text>
                    <ExternalLink size={12} color={menuSecondaryTextColor} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {isIcsUser(user) && (
                    <>


                      <TouchableOpacity
                        style={styles.menuRow}
                        onPress={() => handleOpenWeb('/organization')}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Faculty Organization on web"
                      >
                        <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                          <Network size={16} color={menuIconColor} />
                        </View>
                        <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Faculty Organization</Text>
                        <ExternalLink size={12} color={menuSecondaryTextColor} />
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleOpenWeb('/analytics')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Student Analytics on web"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <BarChart2 size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Student Analytics & Risk</Text>
                    <ExternalLink size={12} color={menuSecondaryTextColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleOpenWeb('/courses')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Full Gradebook on web"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <Table size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Full Gradebook Matrix</Text>
                    <ExternalLink size={12} color={menuSecondaryTextColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleOpenWeb('/assignments')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Quiz & Form Builder on web"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <FileText size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Quiz & Form Builder</Text>
                    <ExternalLink size={12} color={menuSecondaryTextColor} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => handleOpenWeb('/manage-leaderboard')}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Leaderboard Season Manager on web"
                  >
                    <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                      <Trophy size={16} color={menuIconColor} />
                    </View>
                    <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={2}>Season EXP Manager</Text>
                    <ExternalLink size={12} color={menuSecondaryTextColor} />
                  </TouchableOpacity>
                </>
              )}

              {/* Preferences */}
              <Text style={[styles.sectionLabel, { color: menuSecondaryTextColor, marginTop: 14 }]}>PREFERENCES</Text>

              {/* Compact Dark Mode Switch - Fully Visible & Reachable */}
              <View style={styles.compactThemeRow}>
                <View style={styles.compactThemeLeft}>
                  <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                    {isDark ? <Moon size={16} color={menuIconColor} /> : <Sun size={16} color={menuIconColor} />}
                  </View>
                  <Text style={[styles.rowLabel, { color: menuTextColor }]} numberOfLines={1}>
                    {isDark ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={() => { void toggleTheme(); }}
                  trackColor={{ false: 'rgba(255, 255, 255, 0.2)', true: theme.colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.menuRow}>
                <View style={[styles.iconBox, { backgroundColor: menuIconBg }]}>
                  <Shield size={16} color={menuSecondaryTextColor} />
                </View>
                <Text style={[styles.rowLabel, { color: menuSecondaryTextColor, fontSize: 12 }]} numberOfLines={1}>
                  {user?.institute?.code?.toUpperCase() || 'ICS'} &bull; CdM LMS Mobile
                </Text>
              </View>

              {/* Sign Out - Solid High-Contrast Treatment (Guaranteed >= 4.5:1) */}
              <TouchableOpacity
                style={[
                  styles.menuRow,
                  styles.logoutRow,
                  {
                    backgroundColor: logoutTreatment.containerBg,
                    borderColor: logoutTreatment.borderColor,
                    borderWidth: 1,
                  },
                ]}
                onPress={handleLogout}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Sign Out"
              >
                <View style={[styles.iconBox, { backgroundColor: logoutTreatment.iconBg }]}>
                  <LogOut size={16} color={logoutTreatment.iconColor} />
                </View>
                <Text style={[styles.rowLabel, { color: logoutTreatment.textColor, fontWeight: '700' }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </Animated.View>

        {/* ── Foreground Perspective Canvas ── */}
        <Animated.View
          style={[
            styles.canvas,
            {
              borderRadius: canvasBorderRadius,
              opacity: canvasOpacity,
              transform: [
                { translateX: canvasTranslateX },
                { scale: canvasScale },
              ],
            },
            isOpen && styles.canvasShadow,
          ]}
        >
          {children}

          {/* Overlay touchable when shrunken to dismiss menu */}
          {isOpen && (
            <TouchableOpacity
              style={styles.touchOverlay}
              activeOpacity={1}
              onPress={closeMenu}
              {...panResponder.panHandlers}
            />
          )}
        </Animated.View>

        <ProfileEditModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      </View>
    </MoreMenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0F15',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 1,
    overflow: 'hidden',
  },
  menuGradient: {
    flex: 1,
    paddingHorizontal: 12,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingRight: 4,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerText: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userEmail: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
  },
  badgeWrapper: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  instituteBadgeText: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingBottom: 36,
  },
  sectionLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  menuRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 10,
    marginBottom: 2,
  },
  compactThemeRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 10,
    marginBottom: 2,
  },
  compactThemeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  logoutRow: {
    marginTop: 14,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
    zIndex: 2,
  },
  canvasShadow: {
    shadowColor: '#000',
    shadowOffset: { width: -8, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 24,
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
});
