import React, {useState, useMemo, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Text,
  TextInput,
  ScrollView,
  FlatList,
} from 'react-native';
import {ViewStyle, TextStyle} from 'react-native';
import {useTheme} from '../../context/ThemeContext';
import type {ThemeColors} from '../../theme/colors';
import CustomText from '../CustomText/CustomText';
import InlineIcon from '../InlineIcon/InlineIcon';
import {countryList, Country} from './countryList';

interface CountryCodePickerProps {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  _error?: string;
  disabled?: boolean;
  /** Render without its own background/border, for use inside FormField. */
  bare?: boolean;
}

export const CountryCodePicker: React.FC<CountryCodePickerProps> = ({
  value,
  onChange,
  label = 'Country Code',
  _error,
  disabled = false,
  bare = false,
}) => {
  const {colors} = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return countryList;
    return countryList.filter(
      c => c.name.toLowerCase().includes(q) || c.code.includes(q),
    );
  }, [search]);

  const selectedCountry =
    countryList.find(c => c.code === value) || countryList[0];

  const openModal = useCallback(() => {
    if (!disabled) {
      setSearch('');
      setShowModal(true);
    }
  }, [disabled]);

  const closeModal = useCallback(() => setShowModal(false), []);

  const selectCountry = useCallback(
    (country: Country) => {
      onChange(country.code);
      closeModal();
    },
    [onChange, closeModal],
  );

  return (
    <View>
      <Pressable
        onPress={openModal}
        disabled={disabled}
        style={[styles.countryButton, bare && styles.countryButtonBare]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selectedCountry.code} ${selectedCountry.name}`}
        hitSlop={bare ? {top: 10, bottom: 10, left: 10, right: 10} : {top: 10, bottom: 10, left: 0, right: 0}}>
        <View style={styles.countryButtonContent}>
          <Text style={styles.buttonFlagText}>{selectedCountry.flag}</Text>
          <CustomText variant="body" color={colors.primaryTextColor}>
            {selectedCountry.code}
          </CustomText>
          <InlineIcon
            name="chevronDown"
            size={16}
            color={colors.secondaryTextColor}
          />
        </View>
      </Pressable>

      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={StyleSheet.absoluteFill} onPress={closeModal} />

          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <CustomText variant="subheading" style={styles.modalTitle}>
                Select Country Code
              </CustomText>
              <Pressable onPress={closeModal} hitSlop={10}>
                <InlineIcon
                  name="close"
                  size={24}
                  color={colors.secondaryTextColor}
                />
              </Pressable>
            </View>

            <View style={styles.searchWrapper}>
              <View style={styles.searchInput}>
                <InlineIcon
                  name="search"
                  size={20}
                  color={colors.secondaryTextColor}
                />
                <TextInput
                  placeholder="Search country..."
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInputText}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={colors.secondaryTextColor}
                />
              </View>
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={item => item.iso2}
              renderItem={({item}) => (
                <Pressable
                  onPress={() => selectCountry(item)}
                  style={styles.modalItem}>
                  <View style={styles.modalItemContent}>
                    <Text style={styles.modalFlagText}>{item.flag}</Text>
                    <View style={styles.countryInfo}>
                      <CustomText variant="body" color={colors.primaryTextColor}>
                        {item.name}
                      </CustomText>
                      <CustomText
                        variant="caption"
                        color={colors.secondaryTextColor}>
                        {item.code}
                      </CustomText>
                    </View>
                  </View>
                </Pressable>
              )}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              maxToRenderPerBatch={10}
              windowSize={5}
              initialNumToRender={10}
              style={{maxHeight: 350}}
              contentContainerStyle={styles.modalListContent}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create<{
    countryButton: ViewStyle;
    countryButtonContent: ViewStyle;
    buttonFlagText: TextStyle;
    modalOverlay: ViewStyle;
    modalContainer: ViewStyle;
    modalHeader: ViewStyle;
    modalTitle: TextStyle;
    searchWrapper: ViewStyle;
    searchInput: ViewStyle;
    searchInputText: TextStyle;
    modalListContent: ViewStyle;
    modalItem: ViewStyle;
    modalItemContent: ViewStyle;
    modalFlagText: TextStyle;
    countryInfo: ViewStyle;
    countryButtonBare: ViewStyle;
  }>({
    countryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 14,
    },
    countryButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    buttonFlagText: {
      fontSize: 20,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalContainer: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 20,
      maxHeight: '85%',
      minHeight: '60%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontFamily: 'Montserrat-Bold',
    },
    searchWrapper: {
      marginBottom: 16,
    },
    searchInput: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    searchInputText: {
      flex: 1,
      paddingLeft: 10,
      fontSize: 15,
      color: colors.primaryTextColor,
    },
    modalListContent: {
      paddingBottom: 20,
    },
    modalItem: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    countryInfo: {
      flex: 1,
    },
    modalFlagText: {
      fontSize: 24,
    },
    countryButtonBare: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
      paddingHorizontal: 8,
      paddingVertical: 14,
      justifyContent: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
  });