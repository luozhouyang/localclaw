import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

/**
 * LanguageSwitcher component
 * Allows users to switch between supported languages
 * Placed in the dashboard header
 */
export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', label: t('language.en') },
    { code: 'zh', label: t('language.zh') },
  ];

  const currentLanguage = languages.find((lang) => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-orange-500/30 hover:bg-orange-500/10 text-orange-400 font-code"
        >
          <Globe className="w-4 h-4 mr-2" />
          {currentLanguage.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-stone-900 border-orange-500/20 min-w-[120px]"
      >
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`font-code cursor-pointer ${
              i18n.language === language.code
                ? 'bg-orange-500/20 text-orange-400'
                : 'text-stone-300 hover:bg-orange-500/10 hover:text-orange-400'
            }`}
          >
            {language.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
