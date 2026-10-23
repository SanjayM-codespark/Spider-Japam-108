import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {View, StyleSheet} from 'react-native';
import CustomText from '../components/CustomText/CustomText';

interface Toast {
  id: number;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: 'success' | 'error' | 'info', duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

let toastId = 0;

export const ToastProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
      const id = ++toastId;
      setToasts(prev => [...prev, {id, message, type, duration}]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    },
    [],
  );

  const value = useMemo(() => ({showToast}), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{toast: Toast}> = ({toast}) => {
  const bgColor = toast.type === 'error' ? '#FF5252' : toast.type === 'success' ? '#4CAF50' : '#c61e1d';
  
  return (
    <View
      style={[
        styles.toast,
        {backgroundColor: bgColor},
        styles.show,
      ]}>
    <CustomText variant="body" color="#FFFFFF" style={styles.toastText}>
      {toast.message}
    </CustomText>
  </View>
);
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    transform: [{translateY: 100}],
  },
  show: {
    transform: [{translateY: 0}],
  },
  toastText: {
    textAlign: 'center',
  },
});

export const useToast = () => useContext(ToastContext);

export default ToastProvider;