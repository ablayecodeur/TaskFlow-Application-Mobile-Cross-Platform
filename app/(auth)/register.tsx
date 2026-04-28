import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link, router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/authStore';

export default function RegisterScreen() {
  const { register, isLoading, error, clearError } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '', confirm: '' });

  function validate(): boolean {
    const errs = { name: '', email: '', password: '', confirm: '' };
    if (!name.trim()) errs.name = 'Nom requis';
    if (!email.trim()) errs.email = 'Email requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Email invalide';
    if (!password) errs.password = 'Mot de passe requis';
    else if (password.length < 8) errs.password = '8 caractères minimum';
    else if (!/(?=.*[A-Z])(?=.*\d)/.test(password))
      errs.password = 'Doit contenir une majuscule et un chiffre';
    if (password !== confirm) errs.confirm = 'Les mots de passe ne correspondent pas';
    setFieldErrors(errs);
    return !Object.values(errs).some(Boolean);
  }

  async function handleRegister() {
    clearError();
    if (!validate()) return;
    try {
      await register({ name: name.trim(), email: email.trim().toLowerCase(), password });
      router.replace('/(tabs)');
    } catch {
      // error handled by store
    }
  }

  const strength = getPasswordStrength(password);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInUp.delay(100).springify()} style={styles.header}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backBtn}>
                <Ionicons name="arrow-back" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </Link>
            <Text style={styles.title}>Créer un compte</Text>
            <Text style={styles.subtitle}>Rejoignez TaskFlow gratuitement</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.form}>
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Input
              label="Nom complet"
              placeholder="Ablaye Diallo"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              leftIcon="person-outline"
              error={fieldErrors.name}
            />

            <Input
              label="Email"
              placeholder="vous@exemple.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              leftIcon="mail-outline"
              error={fieldErrors.email}
            />

            <Input
              label="Mot de passe"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              leftIcon="lock-closed-outline"
              error={fieldErrors.password}
            />

            {password.length > 0 && (
              <View style={styles.strengthWrapper}>
                <View style={styles.strengthBar}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        { backgroundColor: i <= strength.score ? strength.color : '#1E2440' },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            )}

            <Input
              label="Confirmer le mot de passe"
              placeholder="••••••••"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              autoComplete="new-password"
              leftIcon="shield-checkmark-outline"
              error={fieldErrors.confirm}
            />

            <Button
              label="Créer mon compte"
              onPress={handleRegister}
              loading={isLoading}
              fullWidth
              size="lg"
              style={styles.submitBtn}
            />

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Déjà un compte ? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>Se connecter</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '#1E2440' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const map = [
    { label: 'Très faible', color: '#FF4757' },
    { label: 'Faible', color: '#FF6B35' },
    { label: 'Moyen', color: '#FFB347' },
    { label: 'Fort', color: '#7BED9F' },
    { label: 'Très fort', color: '#2ED573' },
  ];
  return { score, ...map[score] };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 },

  header: { marginBottom: 32 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0F1322',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#1E2440',
  },
  title: { fontSize: 28, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#94A3B8', marginTop: 6 },

  form: {
    backgroundColor: '#0F1322',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1E2440',
  },

  errorBanner: {
    backgroundColor: 'rgba(255,71,87,0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,71,87,0.3)',
  },
  errorText: { color: '#FF4757', fontSize: 13, fontWeight: '500' },

  strengthWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -8, marginBottom: 16 },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSegment: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 11, fontWeight: '600', width: 60, textAlign: 'right' },

  submitBtn: { marginTop: 8 },
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  loginText: { fontSize: 14, color: '#94A3B8' },
  loginLink: { fontSize: 14, color: '#6C63FF', fontWeight: '700' },
});
