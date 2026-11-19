import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { X, UserPlus, Trash2, Building2, Edit2, Lock, Key, ArrowLeft } from 'lucide-react-native';
import { getProfileAvatar } from '../utils/assetImages';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  getTeamMembersApi,
  createTeamMemberApi,
  updateTeamMemberApi,
  removeTeamMemberApi,
} from '../api/team';
import { ITeamMember, IProperty } from '../types/api';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

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
  const [filterPropertyId, setFilterPropertyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Property-scoped members list
  const filteredMembers = useMemo(() => {
    if (!filterPropertyId) return members;
    return members.filter(
      member =>
        member.role === 'owner' || member.assignedProperties?.some(p => p._id === filterPropertyId),
    );
  }, [members, filterPropertyId]);

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
  const [deletingMember, setDeletingMember] = useState<ITeamMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

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
    setEditPassword('');
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

    setDeletingMember(member);
  };

  const handleConfirmRemoveMember = async () => {
    if (!deletingMember) return;
    setIsRemoving(true);
    try {
      await removeTeamMemberApi(deletingMember._id);
      setDeletingMember(null);
      loadMembers();
      queryClient.invalidateQueries({ queryKey: ['team'] });
    } catch {
      Alert.alert('Error', 'Failed to remove team member.');
    } finally {
      setIsRemoving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#FAF5EB' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#E5DDCD',
            backgroundColor: '#FAF5EB',
          }}
        >
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}
          >
            <ArrowLeft size={20} color="#0C192B" strokeWidth={2.3} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: '800',
                color: '#0C192B',
                letterSpacing: -0.3,
              }}
            >
              Staff & Team Access
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#657080', marginTop: 2 }}>
              Access controls & credentials management
            </Text>
          </View>
        </View>

        {/* Tab Switcher */}
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#E5DDCD',
            backgroundColor: '#FAF5EB',
          }}
        >
          <TouchableOpacity
            onPress={() => setActiveTab('list')}
            activeOpacity={0.8}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: activeTab === 'list' ? '#19D3E6' : '#FFFDF8',
              borderWidth: 1,
              borderColor: activeTab === 'list' ? '#19D3E6' : '#E5DDCD',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: '#0C192B',
              }}
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
              activeOpacity={0.8}
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                backgroundColor: activeTab === 'add' ? '#19D3E6' : '#FFFDF8',
                borderWidth: 1,
                borderColor: activeTab === 'add' ? '#19D3E6' : '#E5DDCD',
              }}
            >
              <UserPlus size={14} color="#0C192B" style={{ marginRight: 6 }} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#0C192B',
                }}
              >
                Add Staff Member
              </Text>
            </TouchableOpacity>
          ) : (
            <View
              style={{
                flex: 1,
                paddingVertical: 10,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
              }}
            >
              <Lock size={12} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#94A3B8' }}>Admin Only</Text>
            </View>
          )}
        </View>

        {/* Property Filter Bar */}
        {properties.length > 0 && activeTab === 'list' && (
          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: 6,
              borderBottomWidth: 1,
              borderBottomColor: '#E5DDCD',
              backgroundColor: '#FAF5EB',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#657080',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Filter By Assigned Property
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
            >
              <TouchableOpacity
                onPress={() => setFilterPropertyId(null)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 9999,
                  backgroundColor: filterPropertyId === null ? '#19D3E6' : '#FFFDF8',
                  borderWidth: 1,
                  borderColor: filterPropertyId === null ? '#19D3E6' : '#E5DDCD',
                }}
              >
                <Building2
                  size={13}
                  color={filterPropertyId === null ? '#0C192B' : '#657080'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: filterPropertyId === null ? '800' : '600',
                    color: filterPropertyId === null ? '#0C192B' : '#657080',
                  }}
                >
                  All Staff ({members.length})
                </Text>
              </TouchableOpacity>

              {properties.map(p => {
                const count = members.filter(
                  m => m.role === 'owner' || m.assignedProperties?.some(ap => ap._id === p._id),
                ).length;
                const isSelected = filterPropertyId === p._id;
                return (
                  <TouchableOpacity
                    key={p._id}
                    onPress={() => setFilterPropertyId(p._id)}
                    activeOpacity={0.7}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 9999,
                      backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                      borderWidth: 1,
                      borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                    }}
                  >
                    <Building2
                      size={13}
                      color={isSelected ? '#0C192B' : '#657080'}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: isSelected ? '800' : '600',
                        color: isSelected ? '#0C192B' : '#657080',
                      }}
                    >
                      {p.name} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#4F5330" />
            <Text style={{ color: '#657080', fontSize: 13, fontWeight: '600', marginTop: 12 }}>
              Loading team roster…
            </Text>
          </View>
        ) : activeTab === 'list' ? (
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
            contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 26 }}
            showsVerticalScrollIndicator={false}
          >
            {!isOwner && (
              <View
                style={{
                  backgroundColor: '#FEF3C7',
                  borderWidth: 1,
                  borderColor: '#FDE68A',
                  borderRadius: 14,
                  padding: 12,
                  marginBottom: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Lock size={14} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600', flex: 1 }}>
                  Read-only view. Only organization admin/owner can add or update team members.
                </Text>
              </View>
            )}

            {filteredMembers.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#FFFDF8',
                  borderRadius: 20,
                  padding: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  marginBottom: 16,
                }}
              >
                <Building2 size={32} color="#657080" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#0C192B', marginTop: 8 }}>
                  No staff assigned to this property
                </Text>
                <Text style={{ fontSize: 12, color: '#657080', marginTop: 4, textAlign: 'center' }}>
                  Edit an existing staff member or tap 'Add Staff Member' to assign access.
                </Text>
              </View>
            ) : (
              filteredMembers.map((member, idx) => {
                const isMemberOwner = member.role === 'owner';
                const isManager = member.role === 'manager';

                return (
                  <View
                    key={member._id}
                    style={{
                      backgroundColor: '#FFFDF8',
                      borderRadius: 20,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      marginBottom: 12,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 3,
                      elevation: 1,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            backgroundColor: '#FAF5EB',
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                            overflow: 'hidden',
                            marginRight: 10,
                          }}
                        >
                          <Image
                            source={getProfileAvatar(member._id || member.name, idx)}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{ fontSize: 15, fontWeight: '800', color: '#0C192B' }}
                            numberOfLines={1}
                          >
                            {member.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: '#657080',
                              fontWeight: '500',
                              marginTop: 1,
                            }}
                          >
                            {member.phone} · {member.email}
                          </Text>
                        </View>
                      </View>

                      {/* Role badge */}
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 9999,
                          backgroundColor: isMemberOwner
                            ? '#F3E8FF'
                            : isManager
                              ? '#FAF5EB'
                              : '#DBEAFE',
                          borderWidth: 1,
                          borderColor: isMemberOwner
                            ? '#E9D5FF'
                            : isManager
                              ? '#E5DDCD'
                              : '#BFDBFE',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            color: isMemberOwner ? '#6B21A8' : isManager ? '#4F5330' : '#1D4ED8',
                          }}
                        >
                          {member.role}
                        </Text>
                      </View>
                    </View>

                    {/* Assigned Properties */}
                    <View
                      style={{
                        paddingTop: 8,
                        borderTopWidth: 1,
                        borderTopColor: '#FAF5EB',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Building2 size={12} color="#657080" style={{ marginRight: 2 }} />
                      {isMemberOwner ? (
                        <View
                          style={{
                            backgroundColor: '#FAF5EB',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B21A8' }}>
                            All Properties (Owner Access)
                          </Text>
                        </View>
                      ) : member.assignedProperties && member.assignedProperties.length > 0 ? (
                        member.assignedProperties.map(p => (
                          <View
                            key={p._id}
                            style={{
                              backgroundColor: '#FAF5EB',
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: '#E5DDCD',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#4F5330' }}>
                              {p.name}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <View
                          style={{
                            backgroundColor: '#FAF5EB',
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080' }}>
                            No properties assigned (Restricted)
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Admin Actions: Edit Credentials & Remove */}
                    {isOwner && !isMemberOwner && (
                      <View
                        style={{
                          paddingTop: 10,
                          borderTopWidth: 1,
                          borderTopColor: '#FAF5EB',
                          marginTop: 8,
                          flexDirection: 'row',
                          justifyContent: 'flex-end',
                          gap: 8,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => handleOpenEdit(member)}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 9999,
                            backgroundColor: '#FAF5EB',
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                          }}
                        >
                          <Edit2 size={12} color="#4F5330" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#4F5330' }}>
                            Edit & Password
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleRemoveMember(member)}
                          activeOpacity={0.7}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 9999,
                            backgroundColor: '#FFF1F2',
                            borderWidth: 1,
                            borderColor: '#FECDD3',
                          }}
                        >
                          <Trash2 size={12} color="#BE123C" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#BE123C' }}>
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : (
          /* Add Team Member Form */
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14 }}
            contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 26 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                backgroundColor: '#FFFDF8',
                borderRadius: 20,
                padding: 18,
                borderWidth: 1,
                borderColor: '#E5DDCD',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B', marginBottom: 14 }}>
                New Team Member Details
              </Text>

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Full Name *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: '#0C192B',
                  backgroundColor: '#FAF5EB',
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 14,
                }}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
              />

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Mobile Phone (10 digits) *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: '#0C192B',
                  backgroundColor: '#FAF5EB',
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 14,
                }}
                placeholder="e.g. 9876543210"
                placeholderTextColor="#94A3B8"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Email Address (Login ID) *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: '#0C192B',
                  backgroundColor: '#FAF5EB',
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 14,
                }}
                placeholder="e.g. ramesh@gmail.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                Initial Password *
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: '#0C192B',
                  backgroundColor: '#FAF5EB',
                  fontSize: 13,
                  fontWeight: '600',
                  marginBottom: 14,
                }}
                placeholder="Min 6 characters"
                placeholderTextColor="#94A3B8"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {/* Role Picker */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Staff Role
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                <TouchableOpacity
                  onPress={() => setRole('manager')}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    alignItems: 'center',
                    backgroundColor: role === 'manager' ? '#19D3E6' : '#FAF5EB',
                    borderColor: role === 'manager' ? '#19D3E6' : '#E5DDCD',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: role === 'manager' ? '800' : '600',
                      color: role === 'manager' ? '#0C192B' : '#657080',
                    }}
                  >
                    PG Manager
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setRole('staff')}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    alignItems: 'center',
                    backgroundColor: role === 'staff' ? '#19D3E6' : '#FAF5EB',
                    borderColor: role === 'staff' ? '#19D3E6' : '#E5DDCD',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: role === 'staff' ? '800' : '600',
                      color: role === 'staff' ? '#0C192B' : '#657080',
                    }}
                  >
                    Warden / Security
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Property Assignment */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '800',
                  color: '#657080',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Assigned Properties ({selectedProps.length === 0 ? 'All' : selectedProps.length})
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {properties.map(p => {
                  const isSelected = selectedProps.includes(p._id);
                  return (
                    <TouchableOpacity
                      key={p._id}
                      onPress={() => toggleProperty(p._id)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 9999,
                        backgroundColor: isSelected ? '#19D3E6' : '#FAF5EB',
                        borderWidth: 1,
                        borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: isSelected ? '800' : '600',
                          color: isSelected ? '#0C192B' : '#657080',
                        }}
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
                style={{
                  backgroundColor: '#4F5330',
                  borderRadius: 9999,
                  height: 50,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 15 }}>
                    Create Staff Login
                  </Text>
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
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.5)',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  backgroundColor: '#FAF5EB',
                  borderRadius: 24,
                  padding: 20,
                  width: '100%',
                  maxWidth: 380,
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  maxHeight: '85%',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.15,
                  shadowRadius: 10,
                  elevation: 5,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Key size={16} color="#4F5330" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#0C192B' }}>
                      Edit Staff & Credentials
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setEditingMember(null)}
                    activeOpacity={0.7}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={16} color="#657080" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Name */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Full Name *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: '#FFFDF8',
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#0C192B',
                      marginBottom: 10,
                    }}
                    value={editName}
                    onChangeText={setEditName}
                  />

                  {/* Phone */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Mobile Phone *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: '#FFFDF8',
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#0C192B',
                      marginBottom: 10,
                    }}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />

                  {/* Email */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Login Email *
                  </Text>
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      borderRadius: 12,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: '#FFFDF8',
                      fontSize: 13,
                      fontWeight: '600',
                      color: '#0C192B',
                      marginBottom: 10,
                    }}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  {/* Password change */}
                  <View
                    style={{
                      backgroundColor: '#FEF3C7',
                      borderWidth: 1,
                      borderColor: '#FDE68A',
                      borderRadius: 14,
                      padding: 10,
                      marginBottom: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        fontWeight: '800',
                        color: '#92400E',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      Reset Password (Credentials)
                    </Text>
                    <TextInput
                      style={{
                        borderWidth: 1,
                        borderColor: '#FDE68A',
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: '#FFFDF8',
                        fontSize: 12,
                        fontWeight: '600',
                        color: '#0C192B',
                      }}
                      placeholder="Leave blank to keep unchanged"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry
                      value={editPassword}
                      onChangeText={setEditPassword}
                    />
                    <Text
                      style={{ fontSize: 10, color: '#B45309', marginTop: 4, fontWeight: '500' }}
                    >
                      Enter at least 6 characters to update staff login password.
                    </Text>
                  </View>

                  {/* Role */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Role
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                    <TouchableOpacity
                      onPress={() => setEditRole('manager')}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        alignItems: 'center',
                        backgroundColor: editRole === 'manager' ? '#19D3E6' : '#FFFDF8',
                        borderColor: editRole === 'manager' ? '#19D3E6' : '#E5DDCD',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: editRole === 'manager' ? '800' : '600',
                          color: editRole === 'manager' ? '#0C192B' : '#657080',
                        }}
                      >
                        Manager
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEditRole('staff')}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        alignItems: 'center',
                        backgroundColor: editRole === 'staff' ? '#19D3E6' : '#FFFDF8',
                        borderColor: editRole === 'staff' ? '#19D3E6' : '#E5DDCD',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: editRole === 'staff' ? '800' : '600',
                          color: editRole === 'staff' ? '#0C192B' : '#657080',
                        }}
                      >
                        Warden / Staff
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Status */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Status
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity
                      onPress={() => setEditStatus('active')}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        alignItems: 'center',
                        backgroundColor: editStatus === 'active' ? '#DCFCE7' : '#FFFDF8',
                        borderColor: editStatus === 'active' ? '#86EFAC' : '#E5DDCD',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: editStatus === 'active' ? '800' : '600',
                          color: editStatus === 'active' ? '#15803D' : '#657080',
                        }}
                      >
                        Active
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEditStatus('inactive')}
                      activeOpacity={0.7}
                      style={{
                        flex: 1,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        alignItems: 'center',
                        backgroundColor: editStatus === 'inactive' ? '#FEE2E2' : '#FFFDF8',
                        borderColor: editStatus === 'inactive' ? '#FECDD3' : '#E5DDCD',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: editStatus === 'inactive' ? '800' : '600',
                          color: editStatus === 'inactive' ? '#BE123C' : '#657080',
                        }}
                      >
                        Inactive
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Assigned Properties */}
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      color: '#657080',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    Assigned Properties (
                    {editSelectedProps.length === 0 ? 'All' : editSelectedProps.length})
                  </Text>
                  <View
                    style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}
                  >
                    {properties.map(p => {
                      const isSelected = editSelectedProps.includes(p._id);
                      return (
                        <TouchableOpacity
                          key={p._id}
                          onPress={() => toggleEditProperty(p._id)}
                          activeOpacity={0.7}
                          style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 9999,
                            backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                            borderWidth: 1,
                            borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 10,
                              fontWeight: isSelected ? '800' : '600',
                              color: isSelected ? '#0C192B' : '#657080',
                            }}
                          >
                            {p.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10, paddingTop: 6 }}>
                  <TouchableOpacity
                    onPress={() => setEditingMember(null)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 9999,
                      backgroundColor: '#FFFDF8',
                      borderWidth: 1,
                      borderColor: '#E5DDCD',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#657080' }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSaveEdit}
                    disabled={isUpdating}
                    activeOpacity={0.85}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 9999,
                      backgroundColor: '#4F5330',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>
                        Save Changes
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        <ConfirmDeleteModal
          visible={Boolean(deletingMember)}
          onClose={() => setDeletingMember(null)}
          onConfirm={handleConfirmRemoveMember}
          isLoading={isRemoving}
          title="Remove Team Member?"
          message={`Are you sure you want to remove ${deletingMember?.name} (${deletingMember?.role})? They will immediately lose access to your properties.`}
          confirmLabel="Remove"
        />
      </View>
    </Modal>
  );
};
