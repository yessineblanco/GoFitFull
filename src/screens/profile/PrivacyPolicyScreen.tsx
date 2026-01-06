import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { GradientBackground } from '@/components/shared/GradientBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { getScaledFontSize } from '@/store/textSizeStore';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor } from '@/utils/colorUtils';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'PrivacyPolicy'>;

interface PrivacyPolicyScreenProps {
  navigation: NavigationProp;
}

export const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();

  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: '#030303',
    },


    header: {
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTitle: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
    },
    title: {
      fontSize: getScaledFontSize(28),
      fontWeight: '700' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_700Bold',
      marginBottom: 8,
    },
    lastUpdated: {
      fontSize: getScaledFontSize(14),
      color: 'rgba(255, 255, 255, 0.6)',
      fontFamily: 'Barlow_400Regular',
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: getScaledFontSize(20),
      fontWeight: '600' as const,
      color: theme.colors.primary,
      fontFamily: 'Barlow_600SemiBold',
      marginBottom: 12,
    },
    paragraph: {
      fontSize: getScaledFontSize(16),
      color: 'rgba(255, 255, 255, 0.9)',
      fontFamily: 'Barlow_400Regular',
      lineHeight: getScaledFontSize(24),
      marginBottom: 12,
    },
    listItem: {
      fontSize: getScaledFontSize(16),
      color: 'rgba(255, 255, 255, 0.9)',
      fontFamily: 'Barlow_400Regular',
      lineHeight: getScaledFontSize(24),
      marginBottom: 8,
    },
    contactTitle: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600' as const,
      color: theme.colors.primary,
      fontFamily: 'Barlow_600SemiBold',
      marginBottom: 8,
    },
    contactText: {
      fontSize: getScaledFontSize(16),
      color: 'rgba(255, 255, 255, 0.9)',
      fontFamily: 'Barlow_400Regular',
      lineHeight: getScaledFontSize(24),
    },
  }), [isDark]);

  return (
    <GradientBackground style={dynamicStyles.container}>

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={BRAND_WHITE} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Shield size={20} color={BRAND_PRIMARY} />
          <Text style={dynamicStyles.headerTitle}>Privacy Policy</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={dynamicStyles.title}>Privacy Policy</Text>
          <Text style={dynamicStyles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

          <View style={styles.section}>
            <Text style={dynamicStyles.paragraph}>
              At GoFit, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>1. Information We Collect</Text>
            <Text style={dynamicStyles.paragraph}>
              We collect information that you provide directly to us, including:
            </Text>
            <View style={styles.list}>
              <Text style={dynamicStyles.listItem}>• Account information (email, display name)</Text>
              <Text style={dynamicStyles.listItem}>• Profile information (weight, height, fitness goals)</Text>
              <Text style={dynamicStyles.listItem}>• Workout data (exercises, sets, reps, timestamps)</Text>
              <Text style={dynamicStyles.listItem}>• Progress photos and measurements</Text>
              <Text style={dynamicStyles.listItem}>• Profile pictures</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={dynamicStyles.paragraph}>
              We use the information we collect to:
            </Text>
            <View style={styles.list}>
              <Text style={dynamicStyles.listItem}>• Provide, maintain, and improve our services</Text>
              <Text style={dynamicStyles.listItem}>• Personalize your experience</Text>
              <Text style={dynamicStyles.listItem}>• Track your fitness progress</Text>
              <Text style={dynamicStyles.listItem}>• Send you notifications and reminders</Text>
              <Text style={dynamicStyles.listItem}>• Respond to your comments and questions</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>3. Information Sharing</Text>
            <Text style={dynamicStyles.paragraph}>
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </Text>
            <View style={styles.list}>
              <Text style={dynamicStyles.listItem}>• With your explicit consent</Text>
              <Text style={dynamicStyles.listItem}>• To comply with legal obligations</Text>
              <Text style={dynamicStyles.listItem}>• To protect our rights and safety</Text>
              <Text style={dynamicStyles.listItem}>• With service providers who assist us in operating our app</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>4. Data Security</Text>
            <Text style={dynamicStyles.paragraph}>
              We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your information, we cannot guarantee absolute security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>5. Data Retention</Text>
            <Text style={dynamicStyles.paragraph}>
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>6. Your Rights</Text>
            <Text style={dynamicStyles.paragraph}>
              You have the right to:
            </Text>
            <View style={styles.list}>
              <Text style={dynamicStyles.listItem}>• Access your personal information</Text>
              <Text style={dynamicStyles.listItem}>• Correct inaccurate data</Text>
              <Text style={dynamicStyles.listItem}>• Delete your account and data</Text>
              <Text style={dynamicStyles.listItem}>• Opt-out of certain communications</Text>
              <Text style={dynamicStyles.listItem}>• Export your data</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>7. Children's Privacy</Text>
            <Text style={dynamicStyles.paragraph}>
              Our app is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>8. Changes to This Privacy Policy</Text>
            <Text style={dynamicStyles.paragraph}>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.
            </Text>
          </View>

          <View style={styles.contactSection}>
            <Text style={dynamicStyles.contactTitle}>Contact Us</Text>
            <Text style={dynamicStyles.contactText}>
              If you have any questions about this Privacy Policy, please contact us through the app support section.
            </Text>
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  list: {
    marginLeft: 16,
    marginTop: 8,
  },
  contactSection: {
    marginTop: 32,
    padding: 20,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(132, 196, 65, 0.3)',
  },
});



