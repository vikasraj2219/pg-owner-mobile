import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { Check, Plus, X } from 'lucide-react-native';
import { IProperty } from '../types/api';

interface PropertySwitcherModalProps {
  visible: boolean;
  onClose: () => void;
  properties: IProperty[];
  selectedPropertyId: string | null;
  onSelectProperty: (propertyId: string) => void;
  onOpenAddProperty: () => void;
}

export const PropertySwitcherModal: React.FC<PropertySwitcherModalProps> = ({
  visible,
  onClose,
  properties,
  selectedPropertyId,
  onSelectProperty,
  onOpenAddProperty,
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
                          ? 'border-2 border-[#0A6C50] bg-white'
                          : 'border border-slate-200 bg-white'
                      }`}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-base font-bold text-slate-900 flex-1 mr-2">
                          {property.name}
                          {property.address ? `, ${property.address.split(',')[0]}` : ''}
                        </Text>
                        {isSelected && <Check size={20} color="#0A6C50" strokeWidth={2.5} />}
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
                          className="h-full bg-[#0A6C50] rounded-full"
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
                className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-4 flex-row items-center justify-center my-2 bg-slate-50/50"
              >
                <Plus size={20} color="#0A6C50" strokeWidth={2.5} />
                <Text className="text-base font-bold text-[#0A6C50] ml-2">Add property</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
