import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import CustomText from '../CustomText/CustomText';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../../context/ThemeContext';
import {Fonts} from '../../theme/fonts';
import {useAuth} from '../../context/AuthContext';
import {Naam, addUserNaam, updateUserNaam, markUserNaamSynced} from '../../database/database';
import {createUserNaam, updateUserNaam as updateUserNaamApi} from '../../services/api';

const BEAD_OPTIONS = [108, 1008, 10008];

interface AddNaamBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  editingNaam?: Naam | null;
}

const AddNaamBottomSheet: React.FC<AddNaamBottomSheetProps> = ({
  visible,
  onClose,
  editingNaam,
}) => {
  const insets = useSafeAreaInsets();
  const {colors} = useTheme();
  const {user, token} = useAuth();
  const [naam, setNaam] = useState('');
  const [mantra, setMantra] = useState('');
  const [beadCount, setBeadCount] = useState('108');
  const [dailyGoal, setDailyGoal] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState('');
  const [monthlyGoal, setMonthlyGoal] = useState('');
  const [yearlyGoal, setYearlyGoal] = useState('');

  useEffect(() => {
    if (editingNaam) {
      setNaam(editingNaam.name);
      setMantra(editingNaam.mantra || '');
      setBeadCount(String(editingNaam.bead_count));
      setDailyGoal(editingNaam.daily_goal > 0 ? String(editingNaam.daily_goal) : '');
      setWeeklyGoal(editingNaam.weekly_goal > 0 ? String(editingNaam.weekly_goal) : '');
      setMonthlyGoal(editingNaam.monthly_goal > 0 ? String(editingNaam.monthly_goal) : '');
      setYearlyGoal(editingNaam.yearly_goal > 0 ? String(editingNaam.yearly_goal) : '');
    } else {
      setNaam('');
      setMantra('');
      setBeadCount('108');
      setDailyGoal('');
      setWeeklyGoal('');
      setMonthlyGoal('');
      setYearlyGoal('');
    }
  }, [editingNaam, visible]);

  const handleAdd = async () => {
    if (!naam.trim()) {
      return;
    }
    if (!user) {
      return;
    }

    const beadCountNum = parseInt(beadCount, 10) || 108;
    const dailyGoalNum = dailyGoal.trim() === '' ? 0 : parseInt(dailyGoal, 10) || 0;
    const weeklyGoalNum = weeklyGoal.trim() === '' ? 0 : parseInt(weeklyGoal, 10) || 0;
    const monthlyGoalNum = monthlyGoal.trim() === '' ? 0 : parseInt(monthlyGoal, 10) || 0;
    const yearlyGoalNum = yearlyGoal.trim() === '' ? 0 : parseInt(yearlyGoal, 10) || 0;

    if (editingNaam) {
      // Update locally
      await updateUserNaam(
        editingNaam.id,
        naam.trim(),
        mantra.trim(),
        beadCountNum,
        dailyGoalNum,
        weeklyGoalNum,
        monthlyGoalNum,
        yearlyGoalNum,
      );
      // Update on server
      if (token) {
        try {
          await updateUserNaamApi(token, editingNaam.id, {
            name: naam.trim(),
            mantra: mantra.trim(),
            bead_count: beadCountNum,
            daily_goal: dailyGoalNum,
            weekly_goal: weeklyGoalNum,
            monthly_goal: monthlyGoalNum,
            yearly_goal: yearlyGoalNum,
          });
        } catch (err) {
          console.warn('Failed to update user naam on server:', err);
        }
      }
    } else {
      // Create locally first to get local ID
      const localId = await addUserNaam(
        user.id,
        naam.trim(),
        mantra.trim(),
        beadCountNum,
        dailyGoalNum,
        weeklyGoalNum,
        monthlyGoalNum,
        yearlyGoalNum,
      );
      // Create on server
      if (token) {
        try {
          const remoteNaam = await createUserNaam(token, {
            name: naam.trim(),
            mantra: mantra.trim(),
            bead_count: beadCountNum,
            daily_goal: dailyGoalNum,
            weekly_goal: weeklyGoalNum,
            monthly_goal: monthlyGoalNum,
            yearly_goal: yearlyGoalNum,
          });
          // Mark local record as synced with remote ID
          await markUserNaamSynced(localId, remoteNaam.id);
        } catch (err) {
          console.warn('Failed to create user naam on server:', err);
        }
      }
    }

    onClose();
  };

  const s = styles(colors);

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    options?: {keyboardType?: 'numeric' | 'default'; editable?: boolean; multiline?: boolean; rows?: number},
  ) => (
    <View style={s.inputGroup}>
      <CustomText variant="caption" color={colors.secondaryTextColor} style={s.inputLabel}>
        {label}
      </CustomText>
      {options?.multiline ? (
        <TextInput
          style={[s.input, s.inputMultiline, options?.editable === false && s.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryTextColor}
          keyboardType={options?.keyboardType || 'default'}
          editable={options?.editable !== false}
          multiline
          numberOfLines={options?.rows || 4}
        />
      ) : (
        <TextInput
          style={[s.input, options?.editable === false && s.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.secondaryTextColor}
          keyboardType={options?.keyboardType || 'default'}
          editable={options?.editable !== false}
        />
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
    <View style={s.root}>
      <KeyboardAvoidingView
        behavior="padding"
        style={s.keyboardView}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.header}>
          <CustomText variant="subheading" color={colors.primaryTextColor} style={s.title}>
            {editingNaam ? 'Edit Mantra' : 'Add New Mantra'}
          </CustomText>
          <TouchableOpacity
            style={s.closeButton}
            onPress={onClose}
            activeOpacity={0.7}>
            <CustomText variant="body" color={colors.secondaryTextColor}>
              ✕
            </CustomText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.scrollView}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {renderInput('Title', naam, setNaam, 'Enter title', {
            editable: editingNaam?.is_default !== 1,
          })}

          {renderInput('Content', mantra, setMantra, 'Enter mantra text', {
            multiline: true,
            rows: 4,
          })}

          <View style={s.inputGroup}>
            <CustomText variant="caption" color={colors.secondaryTextColor} style={s.inputLabel}>
              Mala Bead Count
            </CustomText>
            <TextInput
              style={s.input}
              value={beadCount}
              onChangeText={setBeadCount}
              placeholder="108"
              placeholderTextColor={colors.secondaryTextColor}
              keyboardType="numeric"
            />
            <View style={s.beadOptions}>
                  {BEAD_OPTIONS.map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        s.beadOption,
                        beadCount === String(option) && s.beadOptionActive,
                      ]}
                      onPress={() => setBeadCount(String(option))}
                      activeOpacity={0.7}>
                      <CustomText
                        variant="body"
                        color={
                          beadCount === String(option)
                            ? colors.background
                            : colors.primary
                        }>
                        {option}
                      </CustomText>
                    </TouchableOpacity>
                  ))}
</View>
            </View>

          <View style={s.goalsSection}>
            <CustomText variant="subheading" color={colors.primaryTextColor} style={s.goalsTitle}>
              Goals (in number of Malas)
            </CustomText>

            <View style={s.goalsGrid}>
              <View style={s.goalInput}>
                {renderInput('Daily', dailyGoal, setDailyGoal, '1', {
                  keyboardType: 'numeric',
                })}
              </View>
              <View style={s.goalInput}>
                {renderInput('Weekly', weeklyGoal, setWeeklyGoal, '7', {
                  keyboardType: 'numeric',
                })}
              </View>
            </View>

            <View style={s.goalsGrid}>
              <View style={s.goalInput}>
                {renderInput('Monthly', monthlyGoal, setMonthlyGoal, '30', {
                  keyboardType: 'numeric',
                })}
              </View>
              <View style={s.goalInput}>
                {renderInput('Yearly', yearlyGoal, setYearlyGoal, '365', {
                  keyboardType: 'numeric',
                })}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
      </KeyboardAvoidingView>

      <View style={[s.buttonBar, {paddingBottom: insets.bottom + 12}]}>
        <TouchableOpacity
          style={[
            s.addButton,
            !naam.trim() && s.addButtonDisabled,
          ]}
          onPress={handleAdd}
          activeOpacity={0.8}
          disabled={!naam.trim()}>
          <CustomText variant="subheading" color={colors.background}>
            {editingNaam ? 'Update Mantra' : 'Add Mantra'}
          </CustomText>
        </TouchableOpacity>
      </View>
    </View>
    </Modal>
  );
};

const styles = (colors: import('../../theme/colors').ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    backdrop: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
    },
    buttonBar: {
      backgroundColor: colors.background,
      paddingHorizontal: 20,
      paddingTop: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontFamily: Fonts.bold,
    },
    closeButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.surfaceLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    scrollContent: {
      paddingBottom: 12,
    },
    inputGroup: {
      marginBottom: 16,
    },
    inputLabel: {
      fontFamily: Fonts.medium,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: colors.primaryTextColor,
      fontFamily: Fonts.regular,
      fontSize: 14,
    },
    inputMultiline: {
      minHeight: 100,
      textAlignVertical: 'top',
    },
    inputDisabled: {
      opacity: 0.55,
    },
    beadOptions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 10,
    },
    beadOption: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    beadOptionActive: {
      backgroundColor: colors.primary,
    },
    goalsSection: {
      marginTop: 8,
    },
    goalsTitle: {
      fontFamily: Fonts.semiBold,
      marginBottom: 16,
    },
    goalsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    goalInput: {
      flex: 1,
    },
    addButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
    },
    addButtonDisabled: {
      opacity: 0.5,
    },
  });

export default AddNaamBottomSheet;