import { redirect } from 'next/navigation';

/**
 * A short, memorable entry point for personal publishing on mobile devices.
 * Authentication is enforced by the destination page before the editor appears.
 */
export default function PublishPage() {
  redirect('/blog/new');
}
