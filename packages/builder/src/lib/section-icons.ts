import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Image,
  Layout,
  LayoutGrid,
  Layers,
  Mail,
  Megaphone,
  Menu,
  PanelTop,
  ShoppingBag,
  SlidersHorizontal,
  Type,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Banners: Image,
  Content: FileText,
  Header: PanelTop,
  Footer: Layout,
  Layout: LayoutGrid,
  Marketing: Megaphone,
  Media: Image,
  Navigation: Menu,
  Product: ShoppingBag,
  Text: Type,
};

const TYPE_ICONS: Record<string, LucideIcon> = {
  header: PanelTop,
  footer: Layout,
  hero: Image,
  slideshow: Layers,
  features: LayoutGrid,
  testimonial: FileText,
  'main-page': FileText,
  'main-single': FileText,
  'main-archive': FileText,
  'email-signup': Mail,
};

export function getSectionIcon(type: string, category?: string): LucideIcon {
  if (category && CATEGORY_ICONS[category]) return CATEGORY_ICONS[category]!;
  if (TYPE_ICONS[type]) return TYPE_ICONS[type]!;
  return SlidersHorizontal;
}
