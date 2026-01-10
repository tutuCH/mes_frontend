import { useMemo } from 'react'
import { calculatePasswordStrength } from '@/utils/validation'
import { cn } from '@/lib/utils'
import { Check, X } from 'lucide-react'

interface PasswordStrengthMeterProps {
  password: string
  showRequirements?: boolean
}

export function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => calculatePasswordStrength(password), [password])

  const getStrengthColor = () => {
    switch (strength.label) {
      case 'weak':
        return 'bg-red-500'
      case 'fair':
        return 'bg-orange-500'
      case 'good':
        return 'bg-yellow-500'
      case 'strong':
        return 'bg-green-500'
      default:
        return 'bg-gray-300'
    }
  }

  const getStrengthLabel = () => {
    switch (strength.label) {
      case 'weak':
        return 'Weak'
      case 'fair':
        return 'Fair'
      case 'good':
        return 'Good'
      case 'strong':
        return 'Strong'
      default:
        return ''
    }
  }

  if (!password) return null

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Password strength</span>
          <span className={cn(
            'font-medium',
            strength.label === 'weak' && 'text-red-500',
            strength.label === 'fair' && 'text-orange-500',
            strength.label === 'good' && 'text-yellow-500',
            strength.label === 'strong' && 'text-green-500',
          )}>
            {getStrengthLabel()}
          </span>
        </div>
        <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', getStrengthColor())}
            style={{ width: `${(strength.score / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-1 text-xs">
          <RequirementItem checked={strength.checks.length} label="8+ characters" />
          <RequirementItem checked={strength.checks.uppercase} label="Uppercase letter" />
          <RequirementItem checked={strength.checks.lowercase} label="Lowercase letter" />
          <RequirementItem checked={strength.checks.number} label="Number" />
          <RequirementItem checked={strength.checks.special} label="Special character" />
        </div>
      )}
    </div>
  )
}

function RequirementItem({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className={cn(
      'flex items-center gap-1.5',
      checked ? 'text-green-600' : 'text-muted-foreground'
    )}>
      {checked ? (
        <Check className="h-3 w-3" />
      ) : (
        <X className="h-3 w-3" />
      )}
      <span>{label}</span>
    </div>
  )
}
