import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useStyles } from '../../src/theme/use-styles';
import type { Theme } from '../../src/theme/tokens';
import { Button } from '../../src/components/ui/Button';
import { SUPPORTED_LANGUAGES, setAppLanguage, type AppLanguage } from '../../src/i18n';

const languageStyles = (t: Theme) => ({
  fill: { flex: 1, backgroundColor: t.color.paper },
  content: { padding: t.space[5], gap: t.space[3] },
  sectionTitle: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
  option: {
    borderRadius: t.radius.base, borderWidth: 1, borderColor: t.color.surface,
    padding: t.space[3],
  },
  optionActive: { borderColor: t.color.ochre },
  optionLabel: { ...t.type.body, fontFamily: t.font.textSemi, color: t.color.ink },
});

export default function LanguageSettings() {
  const { t, i18n } = useTranslation();
  const s = useStyles(languageStyles);
  const [active, setActive] = useState<string>(i18n.language);
  const [switching, setSwitching] = useState<AppLanguage | null>(null);

  const onSelect = async (language: AppLanguage) => {
    setSwitching(language);
    try {
      await setAppLanguage(language);
      setActive(language);
    } finally {
      setSwitching(null);
    }
  };

  return (
    <ScrollView style={s.fill} contentContainerStyle={s.content}>
      <Text style={s.sectionTitle}>{t('settings.language.title')}</Text>
      {SUPPORTED_LANGUAGES.map((language) => (
        <View key={language} style={[s.option, active === language && s.optionActive]}>
          <Text style={s.optionLabel}>{t(`settings.language.${language}`)}</Text>
          {active !== language && (
            <View style={{ marginTop: 8 }}>
              <Button
                label={t(`settings.language.${language}`)}
                variant="secondary"
                onPress={() => onSelect(language)}
                loading={switching === language}
              />
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}
