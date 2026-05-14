import React from 'react';
import { FormControl, FormLabel, Select, VisuallyHidden } from '@chakra-ui/react';
import { useLanguage } from '../i18n/languageContext';

interface LanguageSwitcherProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  minimal?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ size = 'sm', minimal = false }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <FormControl w="auto">
      {minimal ? (
        <VisuallyHidden as={FormLabel}>{t('language.label')}</VisuallyHidden>
      ) : (
        <FormLabel mb="1" fontSize="xs" color="gray.500">
          {t('language.label')}
        </FormLabel>
      )}
      <Select
        size={size}
        value={language}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setLanguage(event.target.value as 'en' | 'fr')}
        aria-label={t('language.label')}
        minW={minimal ? '80px' : '140px'}
      >
        <option value="en">EN</option>
        <option value="fr">FR</option>
      </Select>
    </FormControl>
  );
};

export default LanguageSwitcher;
