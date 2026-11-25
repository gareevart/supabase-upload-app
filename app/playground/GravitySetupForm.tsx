import { Alert, Button, Checkbox, Text, TextInput } from '@gravity-ui/uikit';
import { useEffect, useRef, type FormEvent } from 'react';
import type { GravitySetup } from '@/lib/playground/terminal';
import type { MessageKey } from './messages';
import styles from './playground.module.css';

type Props = {
  setup: GravitySetup;
  error?: string;
  msg: (key: MessageKey) => string;
  onUpdate: (setup: GravitySetup) => void;
  onSubmit: (event: FormEvent) => void;
  onCancel: () => void;
};

export default function GravitySetupForm({ setup, error, msg, onUpdate, onSubmit, onCancel }: Props) {
  const folderInput = useRef<HTMLInputElement>(null);
  useEffect(() => { folderInput.current?.focus(); }, []);
  const toggle = (field: 'frontend' | 'react' | 'styles' | 'backend', value: boolean) => onUpdate({ ...setup, [field]: value });
  return (
    <form className={styles.gravitySetup} onSubmit={onSubmit}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); onCancel(); } }}
      aria-label={msg('gravitySetup')}>
      <div className={styles.gravityFields}>
        <Text variant="subheader-1">{msg('gravitySetup')}</Text>
        <div className={styles.gravityInputs}>
          <label>{msg('gravityFolder')}
            <TextInput controlRef={folderInput} value={setup.folder} onUpdate={(folder) => onUpdate({ ...setup, folder })}
              controlProps={{ maxLength: 64 }} autoComplete="off" />
          </label>
          <label>{msg('gravityLanguage')}
            <select value={setup.language} onChange={(event) => onUpdate({ ...setup, language: event.target.value === 'js' ? 'js' : 'ts' })}>
              <option value="ts">TypeScript</option>
              <option value="js">JavaScript</option>
            </select>
          </label>
        </div>
        <div className={styles.gravityOptions}>
          <Checkbox checked={setup.frontend} onUpdate={(value) => toggle('frontend', value)}>{msg('gravityFrontend')}</Checkbox>
          {setup.frontend && <>
            <Checkbox checked={setup.react} onUpdate={(value) => toggle('react', value)}>React</Checkbox>
            <Checkbox checked={setup.styles} onUpdate={(value) => toggle('styles', value)}>Stylelint</Checkbox>
          </>}
          <Checkbox checked={setup.backend} onUpdate={(value) => toggle('backend', value)}>{msg('gravityBackend')}</Checkbox>
        </div>
        {error && <Alert theme="danger" message={error} />}
      </div>
      <div className={styles.gravityActions}>
        <Button onClick={onCancel}>{msg('cancel')}</Button>
        <Button type="submit" view="action">{msg('gravityInstall')}</Button>
      </div>
    </form>
  );
}
