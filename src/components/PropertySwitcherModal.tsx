import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Check, Plus, X, Pencil, Building } from 'lucide-react-native';
import { IProperty } from '../types/api';

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
            <View className="bg-white rounded-t-3xl p-5 pt-3 max-h-[80%]">
              {/* Drag Handle */}
              <View className="items-center mb-3">
                <View className="w-12 h-1.5 rounded-full bg-slate-300" />
              </View>

              {/* Header */}
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-extrabold text-slate-900">Switch property</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={18} color="#64748B" />
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
                    className={`p-4 rounded-2xl mb-3.5 ${
                      selectedPropertyId === 'all'
                        ? 'border-2 border-[#4F5330] bg-white'
                        : 'border border-slate-200 bg-white'
                    }`}
                  >
                    <View className="flex-row items-center justify-between mb-1">
                      <View className="flex-row items-center flex-1 mr-2">
                        <View className="w-8 h-8 rounded-lg bg-[#FAF7F2] items-center justify-center mr-2.5 border border-[#D0D7B4]">
                          <Building size={16} color="#4F5330" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-base font-extrabold text-slate-900">
                            All Properties (Overview)
                          </Text>
                          <Text className="text-xs font-medium text-slate-500">
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

                {properties.map(property => {
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
                      className={`p-4 rounded-2xl mb-3.5 ${
                        isSelected
                          ? 'border-2 border-[#4F5330] bg-white'
                          : 'border border-slate-200 bg-white'
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-base font-bold text-slate-900 flex-1 mr-2">
                          {property.name}
                          {property.address ? `, ${property.address.split(',')[0]}` : ''}
                        </Text>
                        <View className="flex-row items-center gap-2">
                          {onEditProperty && (
                            <TouchableOpacity
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              onPress={e => {
                                e.stopPropagation();
                                onClose();
                                onEditProperty(property);
                              }}
                              className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center border border-slate-200"
                            >
                              <Pencil size={12} color="#475569" />
                            </TouchableOpacity>
                          )}
                          {isSelected && <Check size={20} color="#4F5330" strokeWidth={2.5} />}
                        </View>
                      </View>

                      {/* Stats Subtitle */}
                      <Text className="text-xs font-medium text-slate-600 mb-2.5">
                        {totalBeds > 0
                          ? `${occupiedBeds} / ${totalBeds} beds · ${occupancyRate.toFixed(1)}% full`
                          : 'No beds added yet'}
                      </Text>

                      {/* Progress Bar */}
                      <View className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-[#4F5330] rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, occupancyRate))}%`,
                          }}
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
                className="w-full border-2 border-dashed border-[#D0D7B4] rounded-2xl p-4 flex-row items-center justify-center my-2 bg-[#FAF7F2]"
              >
                <Plus size={20} color="#4F5330" strokeWidth={2.5} />
                <Text className="text-base font-bold text-[#4F5330] ml-2">Add property</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
