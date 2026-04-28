import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '../../src/store/taskStore';
import { useAuthStore } from '../../src/store/authStore';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import {
  getPriorityColor,
  getStatusColor,
  getStatusLabel,
  getPriorityLabel,
  formatDate,
  formatRelativeDate,
} from '../../src/utils';
import { scheduleSync } from '../../src/sync/syncEngine';
import { Task, TaskPriority, TaskStatus, UpdateTaskPayload } from '../../src/types';

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { tasks, editTask, removeTask } = useTaskStore();

  const task = tasks.find((t) => t.id === id) ?? null;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<UpdateTaskPayload & { tags: string }>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    dueDate: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate ?? '',
        tags: task.tags.join(', '),
      });
    }
  }, [task]);

  if (!task) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.notFound}>
          <Ionicons name="alert-circle-outline" size={56} color="#2D3352" />
          <Text style={styles.notFoundText}>Tâche introuvable</Text>
          <Button label="Retour" onPress={() => router.back()} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  async function handleSave() {
    if (!form.title?.trim()) return;
    setSaving(true);
    try {
      await editTask(id, {
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate || undefined,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      if (user) scheduleSync(user.id);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Supprimer', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await removeTask(id);
          if (user) scheduleSync(user.id);
          router.back();
        },
      },
    ]);
  }

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== 'completed';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top bar */}
      <Animated.View entering={FadeIn} style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color="#94A3B8" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          Détail
        </Text>
        <View style={styles.topBarActions}>
          <TouchableOpacity onPress={() => setEditing(true)} style={styles.iconBtn}>
            <Ionicons name="pencil-outline" size={18} color="#6C63FF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={18} color="#FF4757" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Priority stripe */}
        <Animated.View
          entering={FadeInDown.delay(50)}
          style={[styles.stripe, { backgroundColor: getPriorityColor(task.priority) }]}
        />

        {/* Title */}
        <Animated.View entering={FadeInDown.delay(80)}>
          <Text style={[styles.taskTitle, task.status === 'completed' && styles.titleDone]}>
            {task.title}
          </Text>
        </Animated.View>

        {/* Badges */}
        <Animated.View entering={FadeInDown.delay(110)} style={styles.badges}>
          <Badge label={getPriorityLabel(task.priority)} color={getPriorityColor(task.priority)} />
          <Badge label={getStatusLabel(task.status)} color={getStatusColor(task.status)} />
          {task.syncStatus !== 'synced' && (
            <Badge label="Non sync." color="#6B7280" />
          )}
        </Animated.View>

        {/* Description */}
        {task.description && (
          <Animated.View entering={FadeInDown.delay(140)} style={styles.section}>
            <SectionLabel icon="document-text-outline" label="Description" />
            <Text style={styles.description}>{task.description}</Text>
          </Animated.View>
        )}

        {/* Dates */}
        <Animated.View entering={FadeInDown.delay(170)} style={styles.section}>
          <SectionLabel icon="calendar-outline" label="Dates" />
          <View style={styles.datesGrid}>
            <DateField label="Créée le" value={formatDate(task.createdAt)} />
            <DateField label="Modifiée le" value={formatDate(task.updatedAt)} />
            {task.dueDate && (
              <DateField
                label="Échéance"
                value={formatRelativeDate(task.dueDate)}
                highlight={isOverdue ? '#FF4757' : undefined}
              />
            )}
            {task.completedAt && (
              <DateField label="Terminée le" value={formatDate(task.completedAt)} highlight="#7BED9F" />
            )}
          </View>
        </Animated.View>

        {/* Tags */}
        {task.tags.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
            <SectionLabel icon="pricetag-outline" label="Tags" />
            <View style={styles.tags}>
              {task.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Quick status change */}
        <Animated.View entering={FadeInDown.delay(230)} style={styles.section}>
          <SectionLabel icon="git-branch-outline" label="Changer le statut" />
          <View style={styles.statusRow}>
            {STATUSES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => editTask(id, { status: s }).then(() => user && scheduleSync(user.id))}
                style={[
                  styles.statusChip,
                  task.status === s && { backgroundColor: `${getStatusColor(s)}22`, borderColor: getStatusColor(s) },
                ]}
              >
                <Text style={[styles.statusText, task.status === s && { color: getStatusColor(s) }]}>
                  {getStatusLabel(s)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editing} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setEditing(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Modifier la tâche</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Titre"
                value={form.title}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              />
              <Input
                label="Description"
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
              />

              <Text style={styles.fieldLabel}>Priorité</Text>
              <View style={styles.chipRow}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setForm((f) => ({ ...f, priority: p }))}
                    style={[styles.chip, form.priority === p && { backgroundColor: `${getPriorityColor(p)}22`, borderColor: getPriorityColor(p) }]}
                  >
                    <Text style={[styles.chipText, form.priority === p && { color: getPriorityColor(p) }]}>
                      {getPriorityLabel(p)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Statut</Text>
              <View style={styles.chipRow}>
                {STATUSES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setForm((f) => ({ ...f, status: s }))}
                    style={[styles.chip, form.status === s && { backgroundColor: `${getStatusColor(s)}22`, borderColor: getStatusColor(s) }]}
                  >
                    <Text style={[styles.chipText, form.status === s && { color: getStatusColor(s) }]}>
                      {getStatusLabel(s)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Date d'échéance"
                value={form.dueDate}
                onChangeText={(v) => setForm((f) => ({ ...f, dueDate: v }))}
                leftIcon="calendar-outline"
                placeholder="YYYY-MM-DD"
              />
              <Input
                label="Tags"
                value={form.tags}
                onChangeText={(v) => setForm((f) => ({ ...f, tags: v }))}
                leftIcon="pricetag-outline"
                placeholder="react, mobile"
              />

              <View style={styles.modalActions}>
                <Button label="Annuler" onPress={() => setEditing(false)} variant="ghost" style={styles.cancelBtn} />
                <Button label="Sauvegarder" onPress={handleSave} loading={saving} style={styles.saveBtn} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionLabel({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Ionicons name={icon} size={14} color="#6B7280" />
      <Text style={styles.sectionLabelText}>{label}</Text>
    </View>
  );
}

function DateField({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <View style={styles.dateField}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={[styles.dateValue, highlight ? { color: highlight } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E2440',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#141828', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#1E2440',
  },
  topBarTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#F1F5F9', marginLeft: 12 },
  topBarActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#141828', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#1E2440',
  },

  content: { padding: 20 },

  stripe: { height: 4, borderRadius: 2, marginBottom: 20 },
  taskTitle: { fontSize: 24, fontWeight: '800', color: '#F1F5F9', lineHeight: 32, marginBottom: 16, letterSpacing: -0.3 },
  titleDone: { textDecorationLine: 'line-through', color: '#4A5270' },

  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },

  section: { marginBottom: 24 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionLabelText: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.6 },

  description: { fontSize: 15, color: '#CBD5E1', lineHeight: 24 },

  datesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dateField: { backgroundColor: '#141828', borderRadius: 12, padding: 12, minWidth: '45%', flex: 1, borderWidth: 1, borderColor: '#1E2440' },
  dateLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 4 },
  dateValue: { fontSize: 14, color: '#F1F5F9', fontWeight: '600' },

  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#1E2440', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 13, color: '#7C85B0', fontWeight: '600' },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1E2440', backgroundColor: '#141828' },
  statusText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  notFoundText: { fontSize: 18, color: '#4A5270', fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: '#0F1322', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#1E2440', maxHeight: '92%',
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#2D3352', alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#F1F5F9', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#1E2440', backgroundColor: '#141828' },
  chipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1 },
  saveBtn: { flex: 2 },
});
