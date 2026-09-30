import React, { useState, useEffect } from "react";
import { ChevronDown, Check, Phone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface CountryInfo {
  code: string;
  name: string;
  ddi: string;
  placeholder: string;
  mask: (digits: string) => string;
}

/**
 * Componente de Bandeira em SVG nativo.
 * Garante renderização de cores perfeita em qualquer sistema operacional (incluindo Windows,
 * onde os emojis unicode de bandeiras não são suportados nativamente e exibem apenas texto).
 */
export function CountryFlag({
  code,
  className = "w-5 h-3.5",
}: {
  code: string;
  className?: string;
}) {
  switch (code) {
    case "BR":
      return (
        <svg viewBox="0 0 20 14" className={className} fill="none" aria-label="Brasil">
          <rect width="20" height="14" fill="#009b3a" rx="1.5" />
          <polygon points="10,1.8 18.2,7 10,12.2 1.8,7" fill="#fedf00" />
          <circle cx="10" cy="7" r="3.2" fill="#002776" />
          <path d="M 7.2 7.8 Q 10 5.6 12.8 7.2" stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
        </svg>
      );
    case "PT":
      return (
        <svg viewBox="0 0 20 14" className={className} fill="none" aria-label="Portugal">
          <rect width="8" height="14" fill="#046a38" rx="1.5" />
          <rect x="8" width="12" height="14" fill="#da291c" />
          <circle cx="8" cy="7" r="2.6" fill="#fedf00" />
          <rect x="6.8" y="5.8" width="2.4" height="2.4" fill="#ffffff" rx="0.5" />
          <rect x="7.3" y="6.3" width="1.4" height="1.4" fill="#002776" />
        </svg>
      );
    case "US":
      return (
        <svg viewBox="0 0 20 14" className={className} fill="none" aria-label="Estados Unidos">
          <rect width="20" height="14" fill="#ffffff" rx="1.5" />
          <rect width="20" height="2" fill="#b22234" />
          <rect y="4" width="20" height="2" fill="#b22234" />
          <rect y="8" width="20" height="2" fill="#b22234" />
          <rect y="12" width="20" height="2" fill="#b22234" />
          <rect width="9" height="7.5" fill="#3c3b6e" />
          <circle cx="2.5" cy="2" r="0.6" fill="#fff" />
          <circle cx="6.5" cy="2" r="0.6" fill="#fff" />
          <circle cx="4.5" cy="3.75" r="0.6" fill="#fff" />
          <circle cx="2.5" cy="5.5" r="0.6" fill="#fff" />
          <circle cx="6.5" cy="5.5" r="0.6" fill="#fff" />
        </svg>
      );
    case "ES":
      return (
        <svg viewBox="0 0 20 14" className={className} fill="none" aria-label="Espanha">
          <rect width="20" height="14" fill="#aa151b" rx="1.5" />
          <rect y="3.5" width="20" height="7" fill="#f1bf00" />
          <circle cx="6" cy="7" r="1.6" fill="#aa151b" />
        </svg>
      );
    case "AR":
      return (
        <svg viewBox="0 0 20 14" className={className} fill="none" aria-label="Argentina">
          <rect width="20" height="14" fill="#74acdf" rx="1.5" />
          <rect y="4.6" width="20" height="4.8" fill="#ffffff" />
          <circle cx="10" cy="7" r="1.4" fill="#f6b40e" />
          <circle cx="10" cy="7" r="0.7" fill="#85340a" />
        </svg>
      );
    case "GB":
      return (
        <svg viewBox="0 0 20 14" className={className} fill="none" aria-label="Reino Unido">
          <rect width="20" height="14" fill="#012169" rx="1.5" />
          <path d="M0,0 L20,14 M20,0 L0,14" stroke="#ffffff" strokeWidth="2.4" />
          <path d="M0,0 L20,14 M20,0 L0,14" stroke="#c8102e" strokeWidth="1.2" />
          <path d="M10,0 V14 M0,7 H20" stroke="#ffffff" strokeWidth="4" />
          <path d="M10,0 V14 M0,7 H20" stroke="#c8102e" strokeWidth="2.2" />
        </svg>
      );
    case "UY":
      return (
        <svg viewBox="0 0 20 14" className={className} fill="none" aria-label="Uruguai">
          <rect width="20" height="14" fill="#ffffff" rx="1.5" />
          <rect y="1.5" width="20" height="1.6" fill="#0038a8" />
          <rect y="4.7" width="20" height="1.6" fill="#0038a8" />
          <rect y="7.9" width="20" height="1.6" fill="#0038a8" />
          <rect y="11.1" width="20" height="1.6" fill="#0038a8" />
          <rect width="7.5" height="7" fill="#ffffff" />
          <circle cx="3.8" cy="3.5" r="1.7" fill="#fcd116" />
        </svg>
      );
    case "PY":
      return (
        <svg viewBox="0 0 20 14" className={className} fill="none" aria-label="Paraguai">
          <rect width="20" height="4.66" fill="#d52b1e" rx="1.5" />
          <rect y="4.66" width="20" height="4.68" fill="#ffffff" />
          <rect y="9.34" width="20" height="4.66" fill="#0038a8" />
          <circle cx="10" cy="7" r="1.3" fill="#fcd116" />
        </svg>
      );
    case "CL":
      return (
        <svg viewBox="0 0 20 14" className={className} fill="none" aria-label="Chile">
          <rect width="20" height="14" fill="#ffffff" rx="1.5" />
          <rect y="7" width="20" height="7" fill="#d52b1e" />
          <rect width="7" height="7" fill="#0039a6" />
          <polygon points="3.5,1.8 4,3.2 5.5,3.2 4.2,4.1 4.7,5.5 3.5,4.6 2.3,5.5 2.8,4.1 1.5,3.2 3,3.2" fill="#ffffff" />
        </svg>
      );
    default:
      return null;
  }
}

export const SUPPORTED_COUNTRIES: CountryInfo[] = [
  {
    code: "BR",
    name: "Brasil",
    ddi: "+55",
    placeholder: "(86) 98111-6254",
    mask: (d: string) => {
      // Formata celular brasileiro (DDD + 9 dígitos) ou fixo (DDD + 8 dígitos)
      if (d.length <= 2) return d.length > 0 ? `(${d}` : "";
      if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
      return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`;
    },
  },
  {
    code: "PT",
    name: "Portugal",
    ddi: "+351",
    placeholder: "912 345 678",
    mask: (d: string) => {
      if (d.length <= 3) return d;
      if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)}`;
    },
  },
  {
    code: "US",
    name: "Estados Unidos",
    ddi: "+1",
    placeholder: "(555) 000-0000",
    mask: (d: string) => {
      if (d.length <= 3) return d.length > 0 ? `(${d}` : "";
      if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
      return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
    },
  },
  {
    code: "ES",
    name: "Espanha",
    ddi: "+34",
    placeholder: "612 34 56 78",
    mask: (d: string) => {
      if (d.length <= 3) return d;
      if (d.length <= 5) return `${d.slice(0, 3)} ${d.slice(3)}`;
      if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5)}`;
      return `${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
    },
  },
  {
    code: "AR",
    name: "Argentina",
    ddi: "+54",
    placeholder: "9 11 1234-5678",
    mask: (d: string) => {
      if (d.length <= 1) return d;
      if (d.length <= 3) return `${d.slice(0, 1)} ${d.slice(1)}`;
      if (d.length <= 7) return `${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3)}`;
      return `${d.slice(0, 1)} ${d.slice(1, 3)} ${d.slice(3, 7)}-${d.slice(7, 11)}`;
    },
  },
  {
    code: "GB",
    name: "Reino Unido",
    ddi: "+44",
    placeholder: "7123 456789",
    mask: (d: string) => {
      if (d.length <= 4) return d;
      return `${d.slice(0, 4)} ${d.slice(4, 10)}`;
    },
  },
  {
    code: "UY",
    name: "Uruguai",
    ddi: "+598",
    placeholder: "91 234 567",
    mask: (d: string) => {
      if (d.length <= 2) return d;
      if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
      return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)}`;
    },
  },
  {
    code: "PY",
    name: "Paraguai",
    ddi: "+595",
    placeholder: "981 123456",
    mask: (d: string) => {
      if (d.length <= 3) return d;
      return `${d.slice(0, 3)} ${d.slice(3, 9)}`;
    },
  },
  {
    code: "CL",
    name: "Chile",
    ddi: "+56",
    placeholder: "9 1234 5678",
    mask: (d: string) => {
      if (d.length <= 1) return d;
      if (d.length <= 5) return `${d.slice(0, 1)} ${d.slice(1)}`;
      return `${d.slice(0, 1)} ${d.slice(1, 5)} ${d.slice(5, 9)}`;
    },
  },
];

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (formattedValue: string) => void;
  className?: string;
  disabled?: boolean;
}

export function PhoneInputWithCountry({
  value,
  onChange,
  className = "",
  disabled = false,
}: PhoneInputWithCountryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(
    SUPPORTED_COUNTRIES[0]! // 🇧🇷 Brasil fixado por padrão
  );
  const [localNumber, setLocalNumber] = useState("");

  // Sincroniza estado interno quando o valor externo muda (ou na inicialização)
  useEffect(() => {
    if (!value) {
      setLocalNumber("");
      return;
    }

    const trimmed = value.trim();

    // Tenta encontrar se começa com algum dos DDIs suportados
    let matchedCountry = SUPPORTED_COUNTRIES.find((c) => trimmed.startsWith(c.ddi));
    let digits = "";

    if (matchedCountry) {
      const remaining = trimmed.slice(matchedCountry.ddi.length).trim();
      digits = remaining.replace(/\D/g, "");
    } else {
      // Se não começa com +, verifica se começa com 55 (DDI Brasil sem +)
      const allDigits = trimmed.replace(/\D/g, "");
      if (allDigits.startsWith("55") && allDigits.length >= 12) {
        matchedCountry = SUPPORTED_COUNTRIES[0];
        digits = allDigits.slice(2);
      } else {
        matchedCountry = selectedCountry;
        digits = allDigits;
      }
    }

    if (matchedCountry) {
      setSelectedCountry(matchedCountry);
      const masked = matchedCountry.mask(digits);
      setLocalNumber(masked);
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Extrai apenas dígitos
    const digitsOnly = rawVal.replace(/\D/g, "");

    // Se usuário colou um número com 55 no início e o país é Brasil (ex: 5586981112222 ou 558632221111)
    let cleanedDigits = digitsOnly;
    if (selectedCountry.code === "BR" && digitsOnly.startsWith("55") && digitsOnly.length >= 12) {
      cleanedDigits = digitsOnly.slice(2);
    }

    const masked = selectedCountry.mask(cleanedDigits);
    setLocalNumber(masked);

    // Constrói o valor canônico internacional (ex: "+55 86 98111-6254")
    if (cleanedDigits.length === 0) {
      onChange("");
    } else {
      const cleanDDD = cleanedDigits.slice(0, 2);
      const rest = cleanedDigits.slice(2);
      let canonical = `${selectedCountry.ddi} ${cleanedDigits}`;
      if (selectedCountry.code === "BR" && cleanedDigits.length >= 10) {
        if (cleanedDigits.length === 11) {
          canonical = `+55 ${cleanDDD} ${rest.slice(0, 5)}-${rest.slice(5)}`;
        } else {
          canonical = `+55 ${cleanDDD} ${rest.slice(0, 4)}-${rest.slice(4)}`;
        }
      }
      onChange(canonical);
    }
  };

  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountry(country);
    setIsOpen(false);

    // Re-mascara o número atual para o novo país
    const digits = localNumber.replace(/\D/g, "");
    const masked = country.mask(digits);
    setLocalNumber(masked);

    if (digits.length > 0) {
      onChange(`${country.ddi} ${digits}`);
    }
  };

  // Calcula o link wa.me resultante para exibição de evidência ao usuário
  const cleanDigits = (value || "").replace(/\D/g, "");
  const waLinkPhone =
    cleanDigits.length >= 10
      ? cleanDigits.startsWith("55")
        ? cleanDigits
        : `55${cleanDigits}`
      : null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center rounded-xl border border-hairline bg-muted/30 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all shadow-xs">
        {/* Seletor Popover com Radix (sem corte por overflow) */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="flex items-center gap-2 px-3 py-2 h-9 text-xs font-semibold text-foreground bg-muted/40 hover:bg-muted/70 active:bg-muted/90 transition-colors border-r border-hairline cursor-pointer select-none rounded-l-xl shrink-0 focus:outline-hidden"
              title="Clique para selecionar o país (DDI)"
            >
              <CountryFlag
                code={selectedCountry.code}
                className="w-5 h-3.5 rounded-xs shadow-xs shrink-0"
              />
              <span className="font-mono text-[11px] font-bold tracking-tight">
                {selectedCountry.ddi}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground opacity-70 shrink-0" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={6}
            className="w-64 p-1.5 z-50 rounded-xl bg-card border-hairline shadow-2xl animate-in fade-in zoom-in-95"
          >
            <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-hairline mb-1">
              Selecione o País (DDI)
            </div>
            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5">
              {SUPPORTED_COUNTRIES.map((country) => {
                const isSelected = country.code === selectedCountry.code;
                return (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelectCountry(country)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors cursor-pointer text-xs ${
                      isSelected
                        ? "bg-primary/15 font-bold text-primary"
                        : "text-foreground hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CountryFlag
                        code={country.code}
                        className="w-5 h-3.5 rounded-xs shadow-xs shrink-0"
                      />
                      <span>{country.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground text-[11px]">
                        {country.ddi}
                      </span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Input Numérico com Máscara Automática */}
        <input
          type="tel"
          disabled={disabled}
          value={localNumber}
          onChange={handleInputChange}
          placeholder={selectedCountry.placeholder}
          className="flex-1 px-3 py-1.5 h-9 bg-transparent text-xs font-mono font-bold text-foreground placeholder:text-muted-foreground/60 rounded-r-xl focus:outline-hidden"
        />
      </div>

      {/* Indicador em tempo real do link wa.me oficial */}
      {waLinkPhone && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="text-muted-foreground">Destino oficial do botão:</span>
          <code className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-[10px]">
            https://wa.me/{waLinkPhone}
          </code>
        </div>
      )}
    </div>
  );
}
