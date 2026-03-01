import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Eye, EyeOff } from 'lucide-react';

interface ApiKeyInputProps {
  value: string;
  hasExistingKey: boolean;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

const PLACEHOLDER_MASK = '********************';

export function ApiKeyInput({
  value,
  hasExistingKey,
  onChange,
  placeholder = 'Enter API Key',
  label = 'API KEY',
}: ApiKeyInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState('');

  // Update display value when value or hasExistingKey changes
  useEffect(() => {
    if (!isFocused && hasExistingKey && value === '') {
      // Show mask when not focused, has existing key, and no new value
      setDisplayValue(PLACEHOLDER_MASK);
    } else {
      // Show actual value when focused or no existing key
      setDisplayValue(value);
    }
  }, [value, hasExistingKey, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Clear mask when focusing
    if (displayValue === PLACEHOLDER_MASK) {
      setDisplayValue('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Restore mask if empty and has existing key
    if (value === '' && hasExistingKey) {
      setDisplayValue(PLACEHOLDER_MASK);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Don't allow typing the mask value directly
    if (newValue === PLACEHOLDER_MASK && !isFocused) {
      return;
    }
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      <Label className="text-orange-400 font-code text-xs tracking-wider flex items-center gap-2">
        <Key className="w-3 h-3" />
        {label}
      </Label>
      <div className="relative">
        <Input
          type={showPassword ? 'text' : 'password'}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={isFocused ? placeholder : hasExistingKey ? PLACEHOLDER_MASK : placeholder}
          className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white placeholder:text-stone-600 pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-orange-400 transition-colors"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {hasExistingKey && (
        <p className="text-xs text-stone-500 font-code">
          已保存加密密钥。输入新值将覆盖，留空保留原密钥。
        </p>
      )}
    </div>
  );
}
