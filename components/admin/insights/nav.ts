/** The Insights pages, grouped as in the sidebar ('' = Overview). */
import {
  BellRing,
  FileText,
  Filter,
  Gauge,
  Heart,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MonitorSmartphone,
  Package,
  Palette,
  Radio,
  RotateCcw,
  Search,
  Settings2,
  Users,
} from 'lucide-react'

export const INSIGHTS_NAV = [
  {
    group: 'Summary',
    items: [
      { id: '', label: 'Overview', icon: LayoutDashboard },
      { id: 'realtime', label: 'Real-time', icon: Radio },
      { id: 'alerts', label: 'Alerts', icon: BellRing },
    ],
  },
  {
    group: 'Sales',
    items: [
      { id: 'sales', label: 'Sales & revenue', icon: IndianRupee },
      { id: 'products', label: 'Products & categories', icon: Package },
      { id: 'customers', label: 'Customers & retention', icon: Users },
      { id: 'refunds', label: 'Refunds & returns', icon: RotateCcw },
      { id: 'wishlist', label: 'Wishlist', icon: Heart },
      { id: 'customization', label: 'Customization', icon: Palette },
    ],
  },
  {
    group: 'Shoppers',
    items: [
      { id: 'funnel', label: 'Shopping funnel', icon: Filter },
      { id: 'marketing', label: 'Marketing & campaigns', icon: Megaphone },
      { id: 'search', label: 'Site search', icon: Search },
      { id: 'pages', label: 'Pages & site speed', icon: Gauge },
      { id: 'technology', label: 'Devices & technology', icon: MonitorSmartphone },
      { id: 'geography', label: 'Geography', icon: MapPin },
    ],
  },
  {
    group: 'Tools',
    items: [
      { id: 'reports', label: 'Reports & export', icon: FileText },
      { id: 'settings', label: 'Setup', icon: Settings2 },
    ],
  },
]
