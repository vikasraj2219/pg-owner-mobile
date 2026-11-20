import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { ArrowLeft, Building2, Check, MapPin, Zap, QrCode } from 'lucide-react-native';
import { PROPERTY_IMAGES } from '../utils/assetImages';
import { IProperty, PropertyType } from '../types/api';
import { useProperties } from '../context/PropertyContext';
import {
  validateName,
  validateUpiId,
  validatePincode,
  getApiErrorMessage,
} from '../utils/validation';
import { SuccessActionModal } from './SuccessActionModal';

interface AddPropertyModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (propertyId: string) => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { properties, createPropertyMutation, isCreating } = useProperties();

  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('boys');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Hyderabad');
  const [pincode, setPincode] = useState('500081');
  const [upiVpa, setUpiVpa] = useState('');
  const [electricityRate, setElectricityRate] = useState('12');
  const [selectedImageIndex, setSelectedImageIndex] = useState(
    properties.length % PROPERTY_IMAGES.length,
  );
  const [createdPropertySuccess, setCreatedPropertySuccess] = useState<IProperty | null>(null);

  const handleSave = async () => {
    const nameResult = validateName(name, 'Property name');
    if (!nameResult.isValid) {
      Alert.alert('Required Field', nameResult.error);
      return;
    }

    const trimmedName = name.trim();
    if (properties.some(p => p.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      Alert.alert(
        'Duplicate Property Name',
        `A property named "${trimmedName}" already exists. Please choose a different name.`,
      );
      return;
    }

    const upiResult = validateUpiId(upiVpa);
    if (!upiResult.isValid) {
      Alert.alert('Invalid UPI ID', upiResult.error);
      return;
    }

    if (pincode.trim()) {
      const pinResult = validatePincode(pincode);
      if (!pinResult.isValid) {
        Alert.alert('Invalid PIN Code', pinResult.error);
        return;
      }
    }

    const rateNum = parseFloat(electricityRate);
    if (isNaN(rateNum) || rateNum < 0) {
      Alert.alert('Invalid Electricity Rate', 'Please enter a valid rate (e.g. 12 or 0).');
      return;
    }

    const ratePaise = Math.round(rateNum * 100);
    const fullAddress = [street.trim(), city.trim(), pincode.trim()].filter(Boolean).join(', ');

    try {
      const created = await createPropertyMutation({
        name: name.trim(),
        type,
        address: fullAddress || undefined,
        city: city.trim() || undefined,
        pincode: pincode.trim() || undefined,
        upiVpa: upiVpa.trim().toLowerCase(),
        electricityRatePaisePerUnit: ratePaise,
      });

      // Reset form
      setName('');
      setStreet('');
      setUpiVpa('');
      setElectricityRate('12');

      setCreatedPropertySuccess(created);
    } catch (err: unknown) {
      const message = getApiErrorMessage(err);
      Alert.alert('Save Failed', message);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: '#FAF5EB' }}
      >
        {/* Top App Bar Header */}
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
            activeOpacity={0.7}
            onPress={onClose}
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
              Add Property
            </Text>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: '#657080',
                marginTop: 2,
              }}
            >
              Create new property and settings
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Property Building Photo Preview Card */}
          <View
            style={{
              backgroundColor: '#FFFDF8',
              borderWidth: 1,
              borderColor: '#E5DDCD',
              borderRadius: 20,
              padding: 14,
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <View
              style={{
                width: 84,
                height: 74,
                borderRadius: 14,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                marginRight: 14,
                backgroundColor: '#EAE8DF',
              }}
            >
              <Image
                source={PROPERTY_IMAGES[selectedImageIndex % PROPERTY_IMAGES.length]}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#657080' }}>
                  🏢 Property Preview
                </Text>
                <View
                  style={{
                    backgroundColor: '#E8F5E9',
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 9999,
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#2E7D32' }}>Active</Text>
                </View>
              </View>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#0C192B' }} numberOfLines={1}>
                {name.trim() || 'New PG Property'}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 3,
                }}
              >
                <MapPin size={12} color="#657080" style={{ marginRight: 4 }} />
                <Text
                  style={{ fontSize: 12, fontWeight: '500', color: '#657080' }}
                  numberOfLines={1}
                >
                  {city.trim() || 'Hyderabad'}
                  {pincode ? `, ${pincode}` : ''}
                </Text>
              </View>
            </View>
          </View>

          {/* Select Building Image Row */}
          <View style={{ marginBottom: 20 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: '#0C192B',
                marginBottom: 8,
              }}
            >
              📸 Select Property Building Photo
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {PROPERTY_IMAGES.map((img, idx) => {
                const isSelected = selectedImageIndex === idx;
                return (
                  <TouchableOpacity
                    key={`prop-img-${idx}`}
                    onPress={() => setSelectedImageIndex(idx)}
                    activeOpacity={0.8}
                    style={{
                      flex: 1,
                      height: 72,
                      borderRadius: 14,
                      overflow: 'hidden',
                      borderWidth: isSelected ? 2.5 : 1,
                      borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                      position: 'relative',
                    }}
                  >
                    <Image
                      source={img}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    {isSelected && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          width: 20,
                          height: 20,
                          borderRadius: 10,
                          backgroundColor: '#19D3E6',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Check size={12} color="#0C192B" strokeWidth={3} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Property Name */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: '#0C192B',
                marginBottom: 8,
              }}
            >
              🏷️ Property Name *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sri Sai Boys PG"
              placeholderTextColor="#94A3B8"
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                fontWeight: '600',
                color: '#0C192B',
              }}
            />
          </View>

          {/* Type Segmented Control */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: '#0C192B',
                marginBottom: 8,
              }}
            >
              👥 Property Type *
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {[
                { id: 'boys', label: 'Boys', icon: '👦' },
                { id: 'girls', label: 'Girls', icon: '👧' },
                { id: 'coliving', label: 'Coliving', icon: '👥' },
              ].map(item => {
                const isSelected = type === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.8}
                    onPress={() => setType(item.id as PropertyType)}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isSelected ? '#19D3E6' : '#FFFDF8',
                      borderWidth: 1,
                      borderColor: isSelected ? '#19D3E6' : '#E5DDCD',
                    }}
                  >
                    <Text style={{ fontSize: 16, marginRight: 6 }}>{item.icon}</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? '800' : '600',
                        color: '#0C192B',
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Street Address */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '800',
                color: '#0C192B',
                marginBottom: 8,
              }}
            >
              📍 Street Address
            </Text>
            <TextInput
              value={street}
              onChangeText={setStreet}
              placeholder="Street, area, landmark"
              placeholderTextColor="#94A3B8"
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                fontWeight: '600',
                color: '#0C192B',
              }}
            />
          </View>

          {/* City & Pincode Row */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 18 }}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#0C192B',
                  marginBottom: 8,
                }}
              >
                🏙️ City
              </Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#94A3B8"
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#0C192B',
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#0C192B',
                  marginBottom: 8,
                }}
              >
                📮 Pincode
              </Text>
              <TextInput
                value={pincode}
                onChangeText={setPincode}
                placeholder="500081"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                maxLength={6}
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 13,
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#0C192B',
                }}
              />
            </View>
          </View>

          {/* UPI ID for Rent */}
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <QrCode size={14} color="#0C192B" style={{ marginRight: 6 }} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#0C192B',
                }}
              >
                💳 UPI ID for Rent *
              </Text>
            </View>
            <TextInput
              value={upiVpa}
              onChangeText={setUpiVpa}
              placeholder="e.g. owner@okhdfcbank"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 13,
                fontSize: 15,
                fontWeight: '600',
                color: '#0C192B',
              }}
            />
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080', marginTop: 4 }}>
              Tenants pay rent directly to this UPI ID via Dynamic QR
            </Text>
          </View>

          {/* Electricity Rate */}
          <View style={{ marginBottom: 26 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Zap size={14} color="#0C192B" style={{ marginRight: 6 }} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '800',
                  color: '#0C192B',
                }}
              >
                ⚡ Electricity Rate (₹ / Unit)
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#FFFDF8',
                borderWidth: 1,
                borderColor: '#E5DDCD',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
              }}
            >
              <TextInput
                value={electricityRate}
                onChangeText={setElectricityRate}
                placeholder="12"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: '600',
                  color: '#0C192B',
                  padding: 0,
                }}
              />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#657080', marginLeft: 8 }}>
                ₹ / unit
              </Text>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '500', color: '#657080', marginTop: 4 }}>
              Used to price sub-meter readings and automatic tenant bill splits
            </Text>
          </View>

          {/* Save Property Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={isCreating}
            style={{
              width: '100%',
              backgroundColor: '#4F5330',
              borderRadius: 9999,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            {isCreating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' }}>
                Save Property
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Modern In-App Success Modal for Property Creation */}
        <SuccessActionModal
          visible={!!createdPropertySuccess}
          onClose={() => {
            const propertyId = createdPropertySuccess?._id;
            setCreatedPropertySuccess(null);
            onClose();
            if (propertyId && onSuccess) {
              onSuccess(propertyId);
            }
          }}
          title="Property Added Successfully!"
          message={`"${createdPropertySuccess?.name}" has been created and is ready to add floors and rooms.`}
          highlightCard={{
            icon: <Building2 size={16} color="#15803D" />,
            title: createdPropertySuccess?.name || 'Property',
            subtitle: createdPropertySuccess?.city
              ? `${createdPropertySuccess.city} · ${createdPropertySuccess.type}`
              : createdPropertySuccess?.type || '',
          }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};
