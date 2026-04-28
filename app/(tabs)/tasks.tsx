import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useTaskStore, selectFilteredTasks } from '../../src/store/taskStore';
import { TaskCard } from '../../src/components/common/TaskCard';
import { SyncIndicator } from '../../src/components/common/SyncIndicator';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { scheduleTaskDueNotification } from '../../src/notifications/notificationService';
import { scheduleSync } from '../../src/sync/syncEngine';
import { getPriorityColor, getPriorityLabel } from '../../src/utils';
import { TaskPriority, TaskStatus } from '../../src/types';

const FILTERS: { key: 'all' | TaskStatus; label: string }[] = [
  { key: 'all', label: 'Tout' },
  { key: 'pending', label: 'En attente' },
  { key: 'in_progress', label: 'En cours' },
  { key: 'completed', label: 'Terminé' },
];

const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export default function TasksScreen() {
  const { user } = useAuthStore();
  const {
    isLoading, isSyncing, filter, searchQuery,
    loadTasks, addTask, toggleComplete, removeTask,
    setFilter, setSearchQuery,
  } = useTaskStore();

  const filteredTasks = useTaskStore(selectFilteredTasks);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium' as TaskPriority, dueDate: '', tags: '',
  });
  const [formErrors, setFormErrors] = useState({ title: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (user) loadTasks(user.id);
  }, [user, loadTasks]);

  function validateForm(): boolean {
    const errs = { title: '' };
    if (!form.title.trim()) errs.title = 'Le titre est requis';
    setFormErrors(errs);
    return !errs.title;
  }

  const handleCreate = useCallback(async () => {
    if (!user || !validateForm()) return;
    setCreating(true);
    try {
      const task = await addTask(user.id, {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      await scheduleTaskDueNotification(task);
      scheduleSync(user.id);

      setForm({ title: '', description: '', priority: 'medium', dueDate: '', tags: '' });
      setShowModal(false);
    } finally {
      setCreating(false);
    }
  }, [user, form, addTask]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Supprimer', 'Supprimer cette tâche ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () => {
          removeTask(id);
          if (user) scheduleSync(user.id);
        },
      },
    ]);
  }, [user, removeTask]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mes Tâches</Text>
          <Text style={styles.subtitle}>{filteredTasks.length} tâche(s)</Text>
        </View>
        <View style={styles.headerRight}>
          <SyncIndicator isSyncing={isSyncing} />
          <TouchableOpacity onPress={() => setShowModal(true)} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Input
          placeholder="Rechercher une tâche…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          leftIcon="search-outline"
          rightIcon={searchQuery ? 'close-circle' : undefined}
          onRightIconPress={() => setSearchQuery('')}
          style={styles.searchInput}
        />
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={() => user && loadTasks(user.id)}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40)} layout={Layout.springify()}>
            <TaskCard
              task={item}
              onPress={() => router.push(`/task/${item.id}`)}
              onToggleComplete={() => {
                toggleComplete(item.id);
                if (user) scheduleSync(user.id);
              }}
              onDelete={() => handleDelete(item.id)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={56} color="#2D3352" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Aucun résultat' : 'Aucune tâche'}
            </Text>
          </View>
        }
      />

      {/* Create modal */}
      <Modal visible={showModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowModal(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Nouvelle tâche</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Titre *"
                placeholder="Titre de la tâche"
                value={form.title}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
                error={formErrors.title}
              />
              <Input
                label="Description"
                placeholder="Détails optionnels…"
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top', paddingTop: 12 }}
              />

              {/* Priority selector */}
              <Text style={styles.fieldLabel}>Priorité</Text>
              <View style={styles.priorityRow}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => setForm((f) => ({ ...f, priority: p }))}
                    style={[styles.priorityChip, form.priority === p && { backgroundColor: `${getPriorityColor(p)}22`, borderColor: getPriorityColor(p) }]}
                  >
                    <Badge label={getPriorityLabel(p)} color={getPriorityColor(p)} size="sm" />
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Date d'échéance"
                placeholder="YYYY-MM-DD"
                value={form.dueDate}
                onChangeText={(v) => setForm((f) => ({ ...f, dueDate: v }))}
                leftIcon="calendar-outline"
                hint="Format : 2025-12-31"
              />
              <Input
                label="Tags"
                placeholder="react, mobile, urgent"
                value={form.tags}
                onChangeText={(v) => setForm((f) => ({ ...f, tags: v }))}
                leftIcon="pricetag-outline"
                hint="Séparez les tags par des virgules"
              />

              <View style={styles.modalActions}>
                <Button
                  label="Annuler"
                  onPress={() => setShowModal(false)}
                  variant="ghost"
                  style={styles.cancelBtn}
                />
                <Button
                  label="Créer"
                  onPress={handleCreate}
                  loading={creating}
                  style={styles.createBtn}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E1A' },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 16, marginBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#F1F5F9', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: '#6C63FF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },

  searchWrapper: { paddingHorizontal: 20, marginBottom: 4 },
  searchInput: { height: 44 },

  filterRow: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#1E2440', backgroundColor: '#141828',
  },
  filterChipActive: { backgroundColor: '#6C63FF', borderColor: '#6C63FF' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#fff' },

  list: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16, color: '#2D3352', fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: '#0F1322', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, borderWidth: 1,
    borderColor: '#1E2440', maxHeight: '90%',
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#2D3352',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#F1F5F9', marginBottom: 20 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 },
  priorityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  priorityChip: {
    borderWidth: 1, borderColor: '#1E2440', borderRadius: 20, padding: 4,
  },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1 },
  createBtn: { flex: 2 },
});
