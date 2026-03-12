import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const COUNTRY_CODES = [
  { code: '+91', flag: '🇮🇳', name: 'India', maxLen: 10 },
  { code: '+971', flag: '🇦🇪', name: 'UAE', maxLen: 9 },
  { code: '+65', flag: '🇸🇬', name: 'Singapore', maxLen: 8 },
  { code: '+1', flag: '🇺🇸', name: 'USA', maxLen: 10 },
  { code: '+44', flag: '🇬🇧', name: 'UK', maxLen: 10 },
  { code: '+61', flag: '🇦🇺', name: 'Australia', maxLen: 9 },
  { code: '+81', flag: '🇯🇵', name: 'Japan', maxLen: 10 },
  { code: '+49', flag: '🇩🇪', name: 'Germany', maxLen: 11 },
  { code: '+33', flag: '🇫🇷', name: 'France', maxLen: 9 },
  { code: '+86', flag: '🇨🇳', name: 'China', maxLen: 11 },
  { code: '+82', flag: '🇰🇷', name: 'South Korea', maxLen: 10 },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', maxLen: 9 },
  { code: '+60', flag: '🇲🇾', name: 'Malaysia', maxLen: 10 },
  { code: '+977', flag: '🇳🇵', name: 'Nepal', maxLen: 10 },
  { code: '+94', flag: '🇱🇰', name: 'Sri Lanka', maxLen: 9 },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh', maxLen: 10 },
];

interface CountryCodeSelectProps {
  value: string;
  onChange: (code: string) => void;
}

export default function CountryCodeSelect({ value, onChange }: CountryCodeSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}> 
      <SelectTrigger className="w-[90px] shrink-0 rounded-r-none border-r-0 h-12 text-sm bg-background focus:border-ring focus:ring-1 focus:ring-ring focus:ring-inset outline-none">
        <SelectValue>
          {COUNTRY_CODES.find(c => c.code === value)?.flag} {value}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {COUNTRY_CODES.map(c => (
          <SelectItem key={c.code} value={c.code} className="text-sm">
            <span className="flex items-center gap-2">
              <span>{c.flag}</span>
              <span className="text-xs">{c.code}</span>
              <span className="text-xs text-muted-foreground">{c.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function getMaxPhoneLength(code: string): number {
  return COUNTRY_CODES.find(c => c.code === code)?.maxLen || 10;
}

export { COUNTRY_CODES };
