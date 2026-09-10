'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Banner, Button, Field, TextInput } from '@/components/ui';
import { EMAIL_DOMAIN, signIn, useDB } from '@/lib/store';

export default function LoginPage() {
  const db = useDB();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);

  // Điều hướng phải nằm trong effect, gọi thẳng trong render là setState-in-render.
  useEffect(() => {
    if (db?.session) router.replace('/');
  }, [db, router]);

  if (db?.session) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setDangGui(true);
    const loi = await signIn(username, password);
    setDangGui(false);
    if (loi) {
      setError(loi);
      return;
    }
    router.replace('/');
  }

  return (
    // Nền trắng trùng nền trong file logo nên ảnh không lộ khung vuông.
    <div className="flex flex-1 flex-col bg-white">
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-5 py-10">
      <img
        src="/chargecore-logo.png"
        alt="ChargeCore Vietnam"
        width={600}
        height={150}
        className="mb-2 h-20 w-auto self-start object-contain"
      />

      <div>
        <h1 className="text-lg font-semibold text-ink">Đăng nhập</h1>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <Field
            label="Tên đăng nhập"
            hint={
              username.includes('@')
                ? 'Đăng nhập bằng email đầy đủ'
                : 'Hệ thống tự ghép thành ' + (username.trim().toLowerCase() || 'se01') + EMAIL_DOMAIN
            }
          >
            <TextInput
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              placeholder="se01"
              className="font-mono"
            />
          </Field>
          <Field label="Mật khẩu">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
              placeholder="••••••"
            />
          </Field>

          {error ? <Banner tone="bad" title={error} /> : null}

          <Button type="submit" className="mt-1" disabled={dangGui}>
            {dangGui ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </Button>
        </form>
      </div>
    </main>
    </div>
  );
}
