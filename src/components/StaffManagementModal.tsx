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
import { X, UserPlus, Trash2, Building, Shield } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getTeamMembersApi, createTeamMemberApi, removeTeamMemberApi } from '../api/team';
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
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [members, setMembers] = useState<ITeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'manager' | 'staff'>('manager');
  const [selectedProps, setSelectedProps] = useState<string[]>([]);

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
    }
  }, [visible, loadMembers]);

  const toggleProperty = (id: string) => {
    setSelectedProps(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
  };

  const handleAddMember = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit Indian mobile number.');
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
      setName('');
      setPhone('');
      setEmail('');
      setPassword('');
      setSelectedProps([]);
      setActiveTab('list');
      loadMembers();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to add team member.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = (member: ITeamMember) => {
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
            <Text className="text-xl font-extrabold text-slate-900">Staff & Manager Logins</Text>
            <Text className="text-xs font-semibold text-slate-500 mt-0.5">
              Access controls & property permissions
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
          >
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
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
          <TouchableOpacity
            onPress={() => setActiveTab('add')}
            className={`flex-1 py-2.5 rounded-xl items-center justify-center border ${
              activeTab === 'add' ? 'bg-[#E6F4EA] border-[#0A6C50]' : 'bg-slate-50 border-slate-200'
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
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0A6C50" />
            <Text className="text-slate-500 text-sm font-medium mt-3">Loading team roster…</Text>
          </View>
        ) : activeTab === 'list' ? (
          <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
            {members.map(member => {
              const isOwner = member.role === 'owner';
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
                          isOwner ? 'bg-purple-100' : isManager ? 'bg-emerald-100' : 'bg-blue-100'
                        }`}
                      >
                        <Shield
                          size={18}
                          color={isOwner ? '#7E22CE' : isManager ? '#0A6C50' : '#1D4ED8'}
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
                        isOwner
                          ? 'bg-purple-50 border border-purple-200'
                          : isManager
                            ? 'bg-emerald-50 border border-emerald-200'
                            : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-black uppercase ${
                          isOwner
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

                  {!isOwner && (
                    <View className="pt-3 border-t border-slate-100 mt-2 flex-row justify-end">
                      <TouchableOpacity
                        onPress={() => handleRemoveMember(member)}
                        className="flex-row items-center px-3 py-1.5 rounded-lg bg-rose-50"
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
          /* Add Team Member Form */
          <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
            <View className="bg-white rounded-2xl p-5 border border-slate-200 mb-6 shadow-xs">
              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">Full Name</Text>
              <TextInput
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900 bg-white shadow-xs text-sm"
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChangeText={setName}
              />

              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">
                Mobile Phone (10 digits)
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
                Email Address
              </Text>
              <TextInput
                className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-slate-900 bg-white shadow-xs text-sm"
                placeholder="e.g. ramesh@gmail.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text className="text-xs font-bold text-slate-700 uppercase mb-1.5">Password</Text>
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
      </View>
    </Modal>
  );
};
