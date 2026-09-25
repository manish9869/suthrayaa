import { LogoLoader } from '@/components/logo-loader'

/** Shown inside the admin shell (sidebar stays put) while an admin page loads. */
export default function AdminLoading() {
  return <LogoLoader size={104} label="Loading…" />
}
