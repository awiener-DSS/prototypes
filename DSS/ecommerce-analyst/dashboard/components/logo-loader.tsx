import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const sizeConfig = {
  sm: {
    shell: 'size-10',
    ring: 'size-14',
    mark: 'size-8 rounded-lg',
    icon: 'size-4',
  },
  md: {
    shell: 'size-16',
    ring: 'size-[5.5rem]',
    mark: 'size-12 rounded-2xl',
    icon: 'size-7',
  },
  lg: {
    shell: 'size-24',
    ring: 'size-[8.5rem]',
    mark: 'size-[4.5rem] rounded-[22px]',
    icon: 'size-11',
  },
} as const;

type LogoLoaderProps = {
  size?: keyof typeof sizeConfig;
  label?: string;
  description?: string;
  className?: string;
  inline?: boolean;
};

export function LogoLoader({
  size = 'md',
  label,
  description,
  className,
  inline = false,
}: LogoLoaderProps) {
  const config = sizeConfig[size];

  const mark = (
    <div className={cn('relative grid place-items-center', config.shell)}>
      <div
        className={cn('logo-loader-orbit absolute rounded-full', config.ring)}
        aria-hidden
      />
      <div
        className={cn('logo-loader-glow absolute rounded-full', config.ring)}
        aria-hidden
      />
      <div
        className={cn(
          'logo-loader-mark relative z-10 grid place-items-center bg-primary text-primary-foreground shadow-[0_12px_40px_rgba(31,111,98,.35)]',
          config.mark,
        )}
      >
        <ArrowUpRight className={config.icon} strokeWidth={2.25} />
      </div>
    </div>
  );

  if (inline) {
    return (
      <span className={cn('inline-flex items-center gap-2', className)} role="status" aria-live="polite">
        {mark}
        {label ? <span className="text-sm font-medium text-foreground">{label}</span> : null}
      </span>
    );
  }

  return (
    <div
      className={cn('flex flex-col items-center gap-4 text-center', className)}
      role="status"
      aria-live="polite"
      aria-label={label ?? 'Loading'}
    >
      {mark}
      {label ? (
        <div className="space-y-1">
          <p className="font-heading text-sm font-semibold tracking-tight text-foreground sm:text-base">{label}</p>
          {description ? (
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
