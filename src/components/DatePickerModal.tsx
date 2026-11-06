import React, { useState, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon } from 'lucide-react-native';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  title?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  title = 'Select Joining Date',
}) => {
  const [viewYear, setViewYear] = useState(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDate.getMonth());

  // Generate calendar days
  const { blankDays, daysInMonth } = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
    return {
      blankDays: Array.from({ length: firstDay }, (_, i) => i),
      daysInMonth: Array.from({ length: totalDays }, (_, i) => i + 1),
    };
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day, 12, 0, 0);
    onSelectDate(newDate);
    onClose();
  };

  const handleQuickSelectToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onSelectDate(now);
    onClose();
  };

  const handleQuickSelect1st = () => {
    const first = new Date(viewYear, viewMonth, 1, 12, 0, 0);
    onSelectDate(first);
    onClose();
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day
    );
  };

  const isSelected = (day: number) => {
    return (
      selectedDate.getFullYear() === viewYear &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getDate() === day
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/50 items-center justify-center p-4">
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
              {/* Header */}
              <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
                    <CalendarIcon size={16} color="#0A6C50" />
                  </View>
                  <Text className="text-base font-extrabold text-slate-900">{title}</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Month Navigation */}
              <View className="flex-row items-center justify-between mb-4 px-1">
                <TouchableOpacity
                  onPress={handlePrevMonth}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                >
                  <ChevronLeft size={18} color="#334155" />
                </TouchableOpacity>

                <Text className="text-base font-black text-slate-800">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </Text>

                <TouchableOpacity
                  onPress={handleNextMonth}
                  className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center"
                >
                  <ChevronRight size={18} color="#334155" />
                </TouchableOpacity>
              </View>

              {/* Day of week headers */}
              <View className="flex-row mb-2">
                {DAYS_OF_WEEK.map((d, idx) => (
                  <View key={idx} className="flex-1 items-center justify-center py-1">
                    <Text className="text-xs font-bold text-slate-400">{d}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View className="flex-row flex-wrap mb-4">
                {blankDays.map(b => (
                  <View key={`b-${b}`} style={{ width: `${100 / 7}%`, height: 40 }} />
                ))}

                {daysInMonth.map(day => {
                  const selected = isSelected(day);
                  const today = isToday(day);

                  return (
                    <View
                      key={`d-${day}`}
                      style={{ width: `${100 / 7}%`, height: 40 }}
                      className="items-center justify-center"
                    >
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => handleSelectDay(day)}
                        className={`w-9 h-9 rounded-full items-center justify-center ${
                          selected
                            ? 'bg-[#0A6C50]'
                            : today
                              ? 'bg-emerald-50 border border-[#0A6C50]'
                              : 'bg-transparent'
                        }`}
                      >
                        <Text
                          className={`text-sm ${
                            selected
                              ? 'font-black text-white'
                              : today
                                ? 'font-bold text-[#0A6C50]'
                                : 'font-medium text-slate-800'
                          }`}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              {/* Quick Preset Buttons */}
              <View className="flex-row gap-2 pt-3 border-t border-slate-100">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleQuickSelectToday}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 items-center justify-center"
                >
                  <Text className="text-xs font-bold text-[#0A6C50]">Today</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleQuickSelect1st}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 border border-slate-200 items-center justify-center"
                >
                  <Text className="text-xs font-bold text-slate-700">1st of Month</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onClose}
                  className="flex-1 py-2.5 rounded-xl bg-[#0A6C50] items-center justify-center"
                >
                  <Text className="text-xs font-bold text-white">Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};
