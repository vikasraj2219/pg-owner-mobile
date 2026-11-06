import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, UserPlus, Trash2, Building, Shield, Edit2, Lock, Key } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getTeamMembersApi,
  createTeamMemberApi,
  updateTeamMemberApi,
  removeTeamMemberApi,
} from '../api/team';
import { ITeamMember, IProperty } from '../types/api';

interface StaffManagementModalProps {
  visible: boolean;
  onClose: () => void;
  properties: IProperty[];
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  visible,
  onClose,
  properties,
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOwner = user?.role === 'owner';

  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [members, setMembers] = useState<ITeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'manager' | 'staff'>('manager');
  const [selectedProps, setSelectedProps] = useState<string[]>([]);

  // Edit Staff State
  const [editingMember, setEditingMember] = useState<ITeamMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'manager' | 'staff'>('manager');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editSelectedProps, setEditSelectedProps] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const resetAddForm = useCallback(() => {
    setName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setRole('manager');
    setSelectedProps([]);
  }, []);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTeamMembersApi();
      setMembers(data);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      loadMembers();
      resetAddForm();
      if (!isOwner) {
        setActiveTab('list');
      }
    }
  }, [visible, loadMembers, resetAddForm, isOwner]);

  const toggleProperty = (id: string) => {
    setSelectedProps(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
  };

  const toggleEditProperty = (id: string) => {
    setEditSelectedProps(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
  };

  const handleAddMember = async () => {
    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only organization owner can add staff members.');
      return;
    }

    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createTeamMemberApi({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        role,
        assignedProperties: selectedProps.length > 0 ? selectedProps : undefined,
      });

      Alert.alert('Team Member Added', `${name} has been added as ${role}.`);
      resetAddForm();
      setActiveTab('list');
      loadMembers();
      queryClient.invalidateQueries({ queryKey: ['team'] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to add team member.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (member: ITeamMember) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditEmail(member.email);
    setEditPassword(''); // empty means keep existing password
    setEditRole(member.role === 'staff' ? 'staff' : 'manager');
    setEditStatus(member.status || 'active');
    setEditSelectedProps(member.assignedProperties?.map(p => p._id) || []);
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;

    if (!editName.trim() || !editPhone.trim() || !editEmail.trim()) {
      Alert.alert('Incomplete Form', 'Name, phone, and email are required.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(editPhone.trim())) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (editPassword.trim() && editPassword.trim().length < 6) {
      Alert.alert('Weak Password', 'New password must be at least 6 characters.');
      return;
    }

    setIsUpdating(true);
    try {
      await updateTeamMemberApi(editingMember._id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim().toLowerCase(),
        password: editPassword.trim() ? editPassword.trim() : undefined,
        role: editRole,
        status: editStatus,
        assignedProperties: editSelectedProps,
      });

      Alert.alert('Credentials Updated', `Staff details and credentials updated for ${editName}.`);
      setEditingMember(null);
      loadMembers();
      queryClient.invalidateQueries({ queryKey: ['team'] });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to update staff credentials.';
      Alert.alert('Error', msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveMember = (member: ITeamMember) => {
    if (!isOwner) {
      Alert.alert('Permission Denied', 'Only organization owner can remove staff members.');
      return;
    }

    if (member.role === 'owner') {
      Alert.alert('Action Restricted', 'Cannot remove organization owner.');
      return;
    }

    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.name} (${member.role})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeTeamMemberApi(member._id);
              loadMembers();
              queryClient.invalidateQueries({ queryKey: ['team'] });
            } catch {
              Alert.alert('Error', 'Failed to remove team member.');
            }
          },
        },
      ],
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-[#F8F9FA]">
        {/* Header */}
        <View className="px-5 pt-4 pb-3 flex-row items-center justify-between border-b border-slate-200/80 bg-white">
          <View>
            <Text className="text-xl font-extrabold text-slate-900">Staff & Team Access</Text>
            <Text className="text-xs font-semibold text-slate-500 mt-0.5">
              Access controls & credentials management
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher - only show Add tab if user is Owner */}
        <View className="px-5 py-3 bg-white border-b border-slate-200/60 flex-row gap-2">
          <TouchableOpacity
            onPress={() => setActiveTab('list')}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center border ${
              activeTab === 'list'
                ? 'bg-[#E6F4EA] border-[#0A6C50]'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === 'list' ? 'text-[#0A6C50]' : 'text-slate-600'
              }`}
            >
              Team Members ({members.length})
            </Text>
          </TouchableOpacity>

          {isOwner ? (
            <TouchableOpacity
              onPress={() => {
                resetAddForm();
                setActiveTab('add');
              }}
              className={`flex-1 py-2.5 rounded-xl items-center justify-center border ${
                activeTab === 'add'
                  ? 'bg-[#E6F4EA] border-[#0A6C50]'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <View className="flex-row items-center">
                <UserPlus size={14} color={activeTab === 'add' ? '#0A6C50' : '#475569'} />
                <Text
                  className={`text-xs font-bold ml-1 ${
                    activeTab === 'add' ? 'text-[#0A6C50]' : 'text-slate-600'
                  }`}
                >
                  Add Staff Member
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View className="flex-1 py-2.5 rounded-xl items-center justify-center bg-slate-100 flex-row">
              <Lock size={12} color="#94A3B8" />
              <Text className="text-xs font-medium text-slate-400 ml-1">Admin Only</Text>
            </View>
          )}
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0A6C50" />
            <Text className="text-slate-500 text-sm font-medium mt-3">Loading team roster…</Text>
          </View>
        ) : activeTab === 'list' ? (
          <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
            {!isOwner && (
              <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex-row items-center">
                <Lock size={14} color="#D97706" />
                <Text className="text-xs text-amber-800 font-semibold ml-2 flex-1">
                  Read-only view. Only organization admin/owner can add or update team members.
                </Text>
              </View>
            )}

            {members.map(member => {
              const isMemberOwner = member.role === 'owner';
              const isManager = member.role === 'manager';
              return (
                <View
                  key={member._id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 mb-3 shadow-xs"
                >
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-row items-center flex-1 mr-2">
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                          isMemberOwner
                            ? 'bg-purple-100'
                            : isManager
                              ? 'bg-emerald-100'
                              : 'bg-blue-100'
                        }`}
                      >
                        <Shield
                          size={18}
                          color={isMemberOwner ? '#7E22CE' : isManager ? '#0A6C50' : '#1D4ED8'}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-extrabold text-slate-900 truncate">
                          {member.name}
                        </Text>
                        <Text className="text-xs text-slate-500 font-medium">
                          {member.phone} · {member.email}
                        </Text>
                      </View>
                    </View>

                    {/* Role badge */}
                    <View
                      className={`px-2.5 py-1 rounded-md ${
                        isMemberOwner
                          ? 'bg-purple-50 border border-purple-200'
                          : isManager
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-black uppercase ${
                          isMemberOwner
                            ? 'text-purple-700'
                            : isManager
                              ? 'text-[#0A6C50]'
                              : 'text-blue-700'
                        }`}
                      >
                        {member.role}
                      </Text>
                    </View>
                  </View>

                  {/* Assigned Properties */}
                  {member.assignedProperties && member.assignedProperties.length > 0 && (
                    <View className="pt-2 border-t border-slate-100 flex-row flex-wrap items-center gap-1.5 mt-1">
                      <Building size={12} color="#64748B" />
                      {member.assignedProperties.map(p => (
                        <View key={p._id} className="bg-slate-100 px-2 py-0.5 rounded-md">
                          <Text className="text-[11px] font-semibold text-slate-700">{p.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Admin Actions: Edit Credentials & Remove */}
                  {isOwner && !isMemberOwner && (
                    <View className="pt-3 border-t border-slate-100 mt-2 flex-row justify-end gap-2">
                      <TouchableOpacity
                        onPress={() => handleOpenEdit(member)}
                        className="flex-row items-center px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200"
                      >
                        <Edit2 size={13} color="#0A6C50" />
                        <Text className="text-xs font-bold text-[#0A6C50] ml-1.5">
                          Edit & Password
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleRemoveMember(member)}
                        className="flex-row items-center px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200"
                      >
                        <Trash2 size={13} color="#BE123C" />
                        <Text className="text-xs font-bold text-rose-700 ml-1.5">Remove</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        ) : (
          /* Add Team Member Form (Owner only) */
          <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
            <View className="bg-white rounded-2xl p-5 border border-slate-200 mb-6 shadow-xs">
              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">Full Name *</Text>
              <TextInput
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900 bg-white shadow-xs text-sm"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChangeText={setName}
              />

              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
                Mobile Phone (10 digits) *
              </Text>
              <TextInput
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900 bg-white shadow-xs text-sm"
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />

              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
                Email Address (Login ID) *
              </Text>
              <TextInput
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900 bg-white shadow-xs text-sm"
                placeholder="e.g. ramesh@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
                Initial Password *
              </Text>
              <TextInput
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900 bg-white shadow-xs text-sm"
                placeholder="Min 6 characters"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {/* Role Picker */}
              <Text className="text-xs font-bold text-slate-700 uppercase mb-2">Staff Role</Text>
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => setRole('manager')}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    role === 'manager'
                      ? 'bg-[#E6F4EA] border-[#0A6C50]'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      role === 'manager' ? 'text-[#0A6C50]' : 'text-slate-600'
                    }`}
                  >
                    PG Manager
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRole('staff')}
                  className={`flex-1 py-3 rounded-xl border items-center ${
                    role === 'staff'
                      ? 'bg-[#E6F4EA] border-[#0A6C50]'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      role === 'staff' ? 'text-[#0A6C50]' : 'text-slate-600'
                    }`}
                  >
                    Warden / Security
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Property Assignment */}
              <Text className="text-xs font-bold text-slate-700 uppercase mb-2">
                Assigned Properties ({selectedProps.length === 0 ? 'All' : selectedProps.length})
              </Text>
              <View className="flex-row flex-wrap gap-2 mb-6">
                {properties.map(p => {
                  const isSelected = selectedProps.includes(p._id);
                  return (
                    <TouchableOpacity
                      key={p._id}
                      onPress={() => toggleProperty(p._id)}
                      className={`px-3 py-2 rounded-xl border ${
                        isSelected
                          ? 'bg-[#E6F4EA] border-[#0A6C50]'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isSelected ? 'text-[#0A6C50]' : 'text-slate-700'
                        }`}
                      >
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmitting}
                onPress={handleAddMember}
                className="bg-[#0A6C50] rounded-xl py-4 items-center justify-center shadow-xs"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-base">Create Staff Login</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Edit Staff & Credentials Modal */}
        {editingMember && (
          <Modal
            visible={!!editingMember}
            transparent
            animationType="fade"
            onRequestClose={() => setEditingMember(null)}
          >
            <View className="flex-1 bg-black/50 justify-center items-center px-4">
              <View className="bg-white rounded-2xl p-5 w-full max-w-sm border border-slate-200 shadow-xl max-h-[85%]">
                <View className="flex-row justify-between items-center mb-3">
                  <View className="flex-row items-center gap-1.5">
                    <Key size={18} color="#0A6C50" />
                    <Text className="text-base font-extrabold text-slate-900">
                      Edit Staff & Credentials
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setEditingMember(null)}
                    className="w-7 h-7 rounded-full bg-slate-100 items-center justify-center"
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Name */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Full Name *
                  </Text>
                  <TextInput
                    className="border border-slate-200 rounded-xl px-3.5 py-2 mb-3 text-slate-900 bg-white text-sm font-semibold"
                    value={editName}
                    onChangeText={setEditName}
                  />

                  {/* Phone */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Mobile Phone *
                  </Text>
                  <TextInput
                    className="border border-slate-200 rounded-xl px-3.5 py-2 mb-3 text-slate-900 bg-white text-sm font-semibold"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />

                  {/* Email */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Login Email *
                  </Text>
                  <TextInput
                    className="border border-slate-200 rounded-xl px-3.5 py-2 mb-3 text-slate-900 bg-white text-sm font-semibold"
                    value={editEmail}
                    onChangeText={setEditEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  {/* Password change */}
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3">
                    <Text className="text-[10px] font-bold text-amber-900 uppercase mb-1">
                      Reset Password (Credentials)
                    </Text>
                    <TextInput
                      className="border border-amber-300 rounded-lg px-3 py-1.5 text-slate-900 bg-white text-xs font-semibold"
                      placeholder="Leave blank to keep unchanged"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry
                      value={editPassword}
                      onChangeText={setEditPassword}
                    />
                    <Text className="text-[9px] text-amber-700 mt-1 font-medium">
                      Enter at least 6 characters to update staff login password.
                    </Text>
                  </View>

                  {/* Role */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">Role</Text>
                  <View className="flex-row gap-2 mb-3">
                    <TouchableOpacity
                      onPress={() => setEditRole('manager')}
                      className={`flex-1 py-2 rounded-xl border items-center ${
                        editRole === 'manager'
                          ? 'bg-[#E6F4EA] border-[#0A6C50]'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          editRole === 'manager' ? 'text-[#0A6C50]' : 'text-slate-600'
                        }`}
                      >
                        Manager
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEditRole('staff')}
                      className={`flex-1 py-2 rounded-xl border items-center ${
                        editRole === 'staff'
                          ? 'bg-[#E6F4EA] border-[#0A6C50]'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          editRole === 'staff' ? 'text-[#0A6C50]' : 'text-slate-600'
                        }`}
                      >
                        Warden / Staff
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Status */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Status
                  </Text>
                  <View className="flex-row gap-2 mb-3">
                    <TouchableOpacity
                      onPress={() => setEditStatus('active')}
                      className={`flex-1 py-2 rounded-xl border items-center ${
                        editStatus === 'active'
                          ? 'bg-emerald-50 border-emerald-500'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          editStatus === 'active' ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        Active
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEditStatus('inactive')}
                      className={`flex-1 py-2 rounded-xl border items-center ${
                        editStatus === 'inactive'
                          ? 'bg-rose-50 border-rose-500'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          editStatus === 'inactive' ? 'text-rose-700' : 'text-slate-600'
                        }`}
                      >
                        Inactive
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Assigned Properties */}
                  <Text className="text-[10px] font-bold text-slate-700 uppercase mb-1">
                    Assigned Properties (
                    {editSelectedProps.length === 0 ? 'All' : editSelectedProps.length})
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5 mb-4">
                    {properties.map(p => {
                      const isSelected = editSelectedProps.includes(p._id);
                      return (
                        <TouchableOpacity
                          key={p._id}
                          onPress={() => toggleEditProperty(p._id)}
                          className={`px-2.5 py-1.5 rounded-lg border ${
                            isSelected
                              ? 'bg-[#E6F4EA] border-[#0A6C50]'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <Text
                            className={`text-[11px] font-bold ${
                              isSelected ? 'text-[#0A6C50]' : 'text-slate-700'
                            }`}
                          >
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <View className="flex-row gap-2 pt-2 border-t border-slate-100">
                  <TouchableOpacity
                    onPress={() => setEditingMember(null)}
                    className="flex-1 py-3 rounded-xl bg-slate-100 items-center justify-center"
                  >
                    <Text className="text-xs font-bold text-slate-700">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={isUpdating}
                    className="flex-1 py-3 rounded-xl bg-[#0A6C50] items-center justify-center"
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text className="text-xs font-bold text-white">Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
};
