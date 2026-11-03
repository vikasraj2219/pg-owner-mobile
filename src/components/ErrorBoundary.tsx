import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, RotateCcw } from 'lucide-react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-[#F8F9FA] justify-center items-center px-6">
          <View className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm items-center shadow-sm">
            <View className="w-14 h-14 rounded-full bg-rose-50 items-center justify-center mb-4 border border-rose-200">
              <AlertTriangle size={28} color="#BE123C" />
            </View>
            <Text className="text-xl font-bold text-slate-900 text-center mb-2">
              Something went wrong
            </Text>
            <Text className="text-xs text-slate-500 text-center mb-6 leading-5">
              An unexpected error occurred. You can safely reload to continue.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={this.handleReset}
              className="w-full bg-[#0A6C50] py-3.5 rounded-xl flex-row items-center justify-center gap-2"
            >
              <RotateCcw size={18} color="#FFFFFF" />
              <Text className="text-white font-bold text-base">Reload Screen</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
