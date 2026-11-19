import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { Check, Plus, X, Pencil, Building } from 'lucide-react-native';
import { IProperty } from '../types/api';
import { getPropertyImage } from '../utils/assetImages';

interface PropertySwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  properties: IProperty[];
  selectedPropertyId: string | null;
  onSelectProperty: (propertyId: string) => void;
  onOpenAddProperty: () => void;
  onEditProperty?: (property: IProperty) => void;
}

export const PropertySwitcherModal: React.FC<PropertySwitcherModalProps> = ({
  visible,
  onClose,
  properties,
  selectedPropertyId,
  onSelectProperty,
  onOpenAddProperty,
  onEditProperty,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View
              style={{ backgroundColor: '#FAF5EB' }}
              className="rounded-t-3xl p-5 pt-3 max-h-[80%]"
            >
              {/* Drag Handle */}
              <View className="items-center mb-3">
                <View style={{ backgroundColor: '#E5DDCD' }} className="w-12 h-1.5 rounded-full" />
              </View>

              {/* Header */}
              <View className="flex-row items-center justify-between mb-4">
                <Text style={{ color: '#0C192B' }} className="text-xl font-extrabold">
                  Switch property
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={{ backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E5DDCD' }}
                  className="w-8 h-8 rounded-full items-center justify-center"
                >
                  <X size={18} color="#657080" />
                </TouchableOpacity>
              </View>

              {/* Property list */}
              <ScrollView showsVerticalScrollIndicator={false} className="mb-2">
                {/* All Properties / Consolidated Overview Option */}
                {properties.length > 1 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      onSelectProperty('all');
                      onClose();
                    }}
                    style={{
                      backgroundColor: '#FFFDF8',
                      borderWidth: selectedPropertyId === 'all' ? 2 : 1,
                      borderColor: selectedPropertyId === 'all' ? '#4F5330' : '#E5DDCD',
                    }}
                    className="p-4 rounded-2xl mb-3.5"
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View
                          style={{
                            backgroundColor: '#FAF5EB',
                            borderWidth: 1,
                            borderColor: '#E5DDCD',
                          }}
                          className="w-10 h-10 rounded-xl items-center justify-center mr-2.5"
                        >
                          <Building size={18} color="#4F5330" />
                        </View>
                        <View className="flex-1">
                          <Text style={{ color: '#0C192B' }} className="text-base font-extrabold">
                            All Properties (Overview)
                          </Text>
                          <Text style={{ color: '#657080' }} className="text-xs font-medium">
                            Consolidated metrics across {properties.length} properties
                          </Text>
                        </View>
                      </View>
                      {selectedPropertyId === 'all' && (
                        <Check size={20} color="#4F5330" strokeWidth={2.5} />
                      )}
                    </View>
                  </TouchableOpacity>
                )}

                {properties.map((property, idx) => {
                  const isSelected = property._id === selectedPropertyId;
                  const totalBeds = property.stats?.totalBeds ?? 0;
                  const occupiedBeds = property.stats?.occupiedBeds ?? 0;
                  const occupancyRate = property.stats?.occupancyRate ?? 0;

                  return (
                    <TouchableOpacity
                      key={property._id}
                      activeOpacity={0.8}
                      onPress={() => {
                        onSelectProperty(property._id);
                        onClose();
                      }}
                      style={{
                        backgroundColor: '#FFFDF8',
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? '#4F5330' : '#E5DDCD',
                      }}
                      className="p-4 rounded-2xl mb-3.5"
                    >
                      <View className="flex-row items-center justify-between mb-2">
                        <View className="flex-row items-center flex-1 mr-2">
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              overflow: 'hidden',
                              borderWidth: 1,
                              borderColor: '#E5DDCD',
                              marginRight: 10,
                            }}
                          >
                            <Image
                              source={getPropertyImage(property, idx)}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          </View>
                          <View className="flex-1">
                            <Text
                              style={{ color: '#0C192B' }}
                              className="text-base font-bold"
                              numberOfLines={1}
                            >
                              {property.name}
                            </Text>
                            <Text
                              style={{ color: '#657080' }}
                              className="text-xs font-medium"
                              numberOfLines={1}
                            >
                              {property.city || 'Property'} ·{' '}
                              {property.type
                                ? property.type.charAt(0).toUpperCase() + property.type.slice(1)
                                : 'Coliving'}
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center gap-2">
                          {onEditProperty && (
                            <TouchableOpacity
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPress={e => {
                                e.stopPropagation();
                                onClose();
                                onEditProperty(property);
                              }}
                              style={{
                                backgroundColor: '#FAF5EB',
                                borderWidth: 1,
                                borderColor: '#E5DDCD',
                              }}
                              className="w-7 h-7 rounded-lg items-center justify-center"
                            >
                              <Pencil size={12} color="#0C192B" />
                            </TouchableOpacity>
                          )}
                          {isSelected && <Check size={20} color="#4F5330" strokeWidth={2.5} />}
                        </View>
                      </View>

                      {/* Stats Subtitle */}
                      <Text style={{ color: '#657080' }} className="text-xs font-medium mb-2.5">
                        {totalBeds > 0
                          ? `${occupiedBeds} / ${totalBeds} beds · ${occupancyRate.toFixed(1)}% full`
                          : 'No beds added yet'}
                      </Text>

                      {/* Progress Bar */}
                      <View
                        style={{ backgroundColor: '#FAF5EB' }}
                        className="w-full h-1.5 rounded-full overflow-hidden"
                      >
                        <View
                          style={{
                            backgroundColor: '#4F5330',
                            width: `${Math.min(100, Math.max(0, occupancyRate))}%`,
                          }}
                          className="h-full rounded-full"
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Add Property Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  onClose();
                  onOpenAddProperty();
                }}
                style={{
                  backgroundColor: '#FFFDF8',
                  borderWidth: 1,
                  borderColor: '#E5DDCD',
                  borderStyle: 'dashed',
                }}
                className="w-full rounded-2xl p-4 flex-row items-center justify-center my-2"
              >
                <Plus size={20} color="#4F5330" strokeWidth={2.5} />
                <Text style={{ color: '#4F5330' }} className="text-base font-bold ml-2">
                  Add property
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
