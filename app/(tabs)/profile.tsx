import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useTaskStore } from '../../src/store/taskStore';
import { useSync } from '../../src/hooks/useSync';
import { SyncIndicator } from '../../src/components/common/SyncIndicator';
import {
  scheduleDailyDigest,
  cancelAllNotifications,
} from '../../src/notifications/notificationService';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { stats } = useTaskStore();
  const { sync, isSyncing, lastSync } = useSync();

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(false);

  async function handleToggleDailyDigest(value: boolean) {
    setDailyDigest(value);
    if (value) {
      await scheduleDailyDigest(8, 0);
    } else {
      await cancelAllNotifications();
    }
  }

  function handleLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(50)} style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <SyncIndicator isSyncing={isSyncing} />
        </Animated.View>

        {/* Stats summary */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.statsRow}>
          <StatPill label="Total" value={stats.total} />
          <StatPill label="Terminées" value={stats.completed} color="#7BED9F" />
          <StatPill label="En retard" value={stats.overdue} color="#FF4757" />
        </Animated.View>

        {/* Sync section */}
        <Animated.View entering={FadeInDown.delay(150)}>
          <SectionTitle>Synchronisation</SectionTitle>
          <View style={styles.card}>
            <SettingRow
              icon="cloud-outline"
              label="Synchroniser maintenant"
              onPress={sync}
              value={isSyncing ? <SyncIndicator isSyncing /> : undefined}
            />
            {lastSync && (
              <View style={styles.lastSyncRow}>
                <Ionicons name="checkmark-circle" size={13} color="#7BED9F" />
                <Text style={styles.lastSyncText}>
                  Dernière sync : {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <SectionTitle>Notifications</SectionTitle>
          <View style={styles.card}>
            <SettingRow
              icon="notifications-outline"
              label="Notifications push"
              value={
                <Switch
                  value={notifEnabled}
                  onValueChange={setNotifEnabled}
                  trackColor={{ false: '#2D3352', true: '#6C63FF' }}
                  thumbColor="#fff"
                />
              }
            />
            <View style={styles.separator} />
            <SettingRow
              icon="sunny-outline"
              label="Résumé quotidien (8h)"
              value={
                <Switch
                  value={dailyDigest}
                  onValueChange={handleToggleDailyDigest}
                  trackColor={{ false: '#2D3352', true: '#6C63FF' }}
                  thumbColor="#fff"
                />
              }
            />
          </View>
        </Animated.View>

        {/* Account */}
        <Animated.View entering={FadeInDown.delay(250)}>
          <SectionTitle>Compte</SectionTitle>
          <View style={styles.card}>
            <SettingRow
              icon="person-outline"
              label="Modifier le profil"
              chevron
              onPress={() => Alert.alert('Bientôt disponible')}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="lock-closed-outline"
              label="Changer le mot de passe"
              chevron
              onPress={() => Alert.alert('Bientôt disponible')}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="shield-outline"
              label="Confidentialité"
              chevron
              onPress={() => Alert.alert('Bientôt disponible')}
            />
          </View>
        </Animated.View>

        {/* About */}
        <Animated.View entering={FadeInDown.delay(300)}>
          <SectionTitle>À propos</SectionTitle>
          <View style={styles.card}>
            <SettingRow icon="information-circle-outline" label="Version" value={<Text style={styles.versionText}>1.0.0</Text>} />
            <View style={styles.separator} />
            <SettingRow icon="code-slash-outline" label="Développeur" value={<Text style={styles.versionText}>ablayecodeur</Text>} />
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View entering={FadeInDown.delay(350)}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#FF4757" />
            <Text style={styles.logoutText}>Se déconnecter</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function StatPill({ label, value, color = '#6C63FF' }: { label: string; value: number; color?: string }) {
  return (
    <View style={[styles.statPill, { borderColor: `${color}33` }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  chevron,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
}) {
  const Inner = (
    <View style={styles.settingRow}>
      <Ionicons name={icon} size={18} color="#6B7280" style={styles.settingIcon} />
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingRight}>
        {value}
        {chevron && <Ionicons name="chevron-forward" size={16} color="#3D4466" />}
      </View>
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Inner}</TouchableOpacity>;
  }
  return Inner;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  content: { paddingHorizontal: 20, paddingTop: 24 },

  header: { alignItems: 'center', marginBottom: 28, gap: 8 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: '#6C63FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.3 },
  email: { fontSize: 14, color: '#6B7280' },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  statPill: {
    flex: 1,
    backgroundColor: '#141828',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    gap: 4,
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500' },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A5270',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#0F1322',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1E2440',
    marginBottom: 20,
    overflow: 'hidden',
  },
  separator: { height: 1, backgroundColor: '#1E2440', marginHorizontal: 16 },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingIcon: { marginRight: 12 },
  settingLabel: { flex: 1, fontSize: 15, color: '#E2E8F0', fontWeight: '500' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  versionText: { fontSize: 13, color: '#4A5270', fontWeight: '600' },

  lastSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  lastSyncText: { fontSize: 12, color: '#4A5270' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,71,87,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.2)',
    marginBottom: 16,
  },
  logoutText: { fontSize: 15, color: '#FF4757', fontWeight: '700' },

  bottomPad: { height: 100 },
});
