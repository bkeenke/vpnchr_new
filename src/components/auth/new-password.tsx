'use client';

import { useState } from 'react';
import { IconEye, IconEyeOff, IconWand } from '@tabler/icons-react';
import { toast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { copyText } from '@/lib/clipboard';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*-_';
const GROUPS = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z\d]/];

/** Криптостойкий пароль без похожих символов (l/1, O/0), с буквами обоих регистров, цифрой и спецсимволом. */
export function generatePassword(length = 16) {
  const limit = 256 - (256 % ALPHABET.length); // отбрасываем байты сверх кратного — без смещения распределения
  for (;;) {
    let out = '';
    while (out.length < length) {
      for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
        if (b < limit && out.length < length) out += ALPHABET[b % ALPHABET.length];
      }
    }
    if (GROUPS.every((re) => re.test(out))) return out;
  }
}

type Props = {
  password: string;
  confirm: string;
  onChange: (v: { password: string; confirm: string }) => void;
  errors?: { password?: string; confirm?: string };
  label?: string;
  autoFocus?: boolean;
};

/** Поля «пароль + повтор» с генератором: сгенерированный пароль подставляется в оба поля, показывается и копируется. */
export function NewPasswordFields({ password, confirm, onChange, errors, label = 'Пароль', autoFocus }: Props) {
  const [visible, setVisible] = useState(false);
  const type = visible ? 'text' : 'password';

  async function generate() {
    const value = generatePassword();
    onChange({ password: value, confirm: value });
    setVisible(true);
    if (await copyText(value)) toast.success('Пароль сгенерирован и скопирован');
    else toast.success('Пароль сгенерирован — сохраните его');
  }

  return (
    <>
      <div className="space-y-1.5">
        <Input
          label={label}
          type={type}
          autoComplete="new-password"
          value={password}
          error={errors?.password}
          onChange={(e) => onChange({ password: e.target.value, confirm })}
          autoFocus={autoFocus}
          suffix={
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="text-muted hover:text-text grid size-10 place-items-center rounded-lg transition"
              aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {visible ? <IconEyeOff className="size-5" /> : <IconEye className="size-5" />}
            </button>
          }
        />
        <button type="button" onClick={generate} className="text-green flex items-center gap-1.5 text-xs font-semibold hover:underline">
          <IconWand className="size-4" /> Сгенерировать надёжный пароль
        </button>
      </div>
      <Input
        label="Повторите пароль"
        type={type}
        autoComplete="new-password"
        value={confirm}
        error={errors?.confirm}
        onChange={(e) => onChange({ password, confirm: e.target.value })}
      />
    </>
  );
}
