import { cn } from '../lib/utils';

type LogoProps = {
  className?: string;
  width?: number;
  height?: number;
  alt?: string;
};

export function Logo({ className, width = 32, height = 32, alt = 'Zodyk' }: LogoProps) {
  return (
    <>
      <img
        src="/logo-light.svg"
        alt={alt}
        width={width}
        height={height}
        className={cn('block dark:hidden', className)}
      />
      <img
        src="/logo-dark.svg"
        alt={alt}
        width={width}
        height={height}
        className={cn('hidden dark:block', className)}
      />
    </>
  );
}
