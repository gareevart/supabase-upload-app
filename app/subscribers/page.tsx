import { redirect } from 'next/navigation';

export default function SubscribersPage() {
  redirect('/broadcasts?tab=subscribers');
}
