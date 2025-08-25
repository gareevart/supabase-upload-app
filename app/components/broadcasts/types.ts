import { Database } from '@/lib/types';

// Type for a broadcast from the database
export type Broadcast = Database['public']['Tables']['sent_mails']['Row'];

// Type for subscriber
export type Subscriber = Database['public']['Tables']['subscribe']['Row'];

// Type for broadcast group
export type BroadcastGroup = Database['public']['Tables']['broadcast_groups']['Row'] & {
  subscriber_count?: number;
};

// Type for creating a new broadcast
export type NewBroadcast = {
  subject: string;
  content: any;
  recipients: string[];
  group_ids?: string[];
  scheduled_for?: string | null;
};

// Type for broadcast status
export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';

// Type for broadcast statistics
export type BroadcastStats = {
  total: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
};

// Type for date-time picker
export type DateTimePickerProps = {
  value: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  disabled?: boolean;
};

// Type for broadcast form props
export type BroadcastFormProps = {
  initialData?: Partial<Broadcast>;
  onSave?: (data: NewBroadcast) => Promise<void>;
  onSchedule?: (data: NewBroadcast, date: Date) => Promise<void>;
  onSend?: (data: NewBroadcast) => Promise<void>;
  isSubmitting?: boolean;
};

// Type for broadcast list props
export type BroadcastListProps = {
  broadcasts: Broadcast[];
  onView?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSend?: (id: string) => void;
  onSchedule?: (id: string, date: Date) => void;
  onCancelSchedule?: (id: string) => void;
};

// Type for broadcast detail props
export type BroadcastDetailProps = {
  broadcast: Broadcast;
  stats?: BroadcastStats;
  onBack?: () => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onSend?: (id: string) => void;
  onSchedule?: (id: string, date: Date) => void;
  onCancelSchedule?: (id: string) => void;
};