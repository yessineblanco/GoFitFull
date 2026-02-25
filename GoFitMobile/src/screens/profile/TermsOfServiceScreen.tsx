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
import { ArrowLeft, FileText } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { getScaledFontSize } from '@/store/textSizeStore';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor } from '@/utils/colorUtils';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'TermsOfService'>;

interface TermsOfServiceScreenProps {
  navigation: NavigationProp;
}

export const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({ navigation }) => {
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
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
    },
    title: {
      fontSize: getScaledFontSize(28),
      fontWeight: '700' as const,
      color: BRAND_WHITE,
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
          <FileText size={20} color={BRAND_PRIMARY} />
          <Text style={dynamicStyles.headerTitle}>Terms of Service</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={dynamicStyles.title}>Terms of Service</Text>
          <Text style={dynamicStyles.lastUpdated}>Last Updated: {new Date().toLocaleDateString()}</Text>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={dynamicStyles.paragraph}>
              By accessing and using the GoFit mobile application, you accept and agree to be bound by the terms and provision of this agreement.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>2. Use License</Text>
            <Text style={dynamicStyles.paragraph}>
              Permission is granted to temporarily download one copy of GoFit for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </Text>
            <View style={styles.list}>
              <Text style={dynamicStyles.listItem}>• Modify or copy the materials</Text>
              <Text style={dynamicStyles.listItem}>• Use the materials for any commercial purpose</Text>
              <Text style={dynamicStyles.listItem}>• Attempt to decompile or reverse engineer any software</Text>
              <Text style={dynamicStyles.listItem}>• Remove any copyright or other proprietary notations</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>3. Disclaimer</Text>
            <Text style={dynamicStyles.paragraph}>
              The materials on GoFit are provided on an 'as is' basis. GoFit makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>4. Limitations</Text>
            <Text style={dynamicStyles.paragraph}>
              In no event shall GoFit or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on GoFit, even if GoFit or a GoFit authorized representative has been notified orally or in writing of the possibility of such damage.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>5. Accuracy of Materials</Text>
            <Text style={dynamicStyles.paragraph}>
              The materials appearing on GoFit could include technical, typographical, or photographic errors. GoFit does not warrant that any of the materials on its app are accurate, complete, or current. GoFit may make changes to the materials contained on its app at any time without notice.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>6. Links</Text>
            <Text style={dynamicStyles.paragraph}>
              GoFit has not reviewed all of the sites linked to its app and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by GoFit of the site. Use of any such linked website is at the user's own risk.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>7. Modifications</Text>
            <Text style={dynamicStyles.paragraph}>
              GoFit may revise these terms of service for its app at any time without notice. By using this app you are agreeing to be bound by the then current version of these terms of service.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={dynamicStyles.sectionTitle}>8. Governing Law</Text>
            <Text style={dynamicStyles.paragraph}>
              These terms and conditions are governed by and construed in accordance with applicable laws and you irrevocably submit to the exclusive jurisdiction of the courts in that state or location.
            </Text>
          </View>

          <View style={styles.contactSection}>
            <Text style={dynamicStyles.contactTitle}>Contact Us</Text>
            <Text style={dynamicStyles.contactText}>
              If you have any questions about these Terms of Service, please contact us through the app support section.
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



