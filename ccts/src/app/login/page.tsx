'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Banner, Button, Field, TextInput } from '@/components/ui';
import { signIn, useDB } from '@/lib/store';

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
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
        <div className="animate-fade-up">
          <img
            src="/chargecore-logo.png"
            alt="ChargeCore Vietnam"
            width={600}
            height={150}
            className="h-16 w-auto object-contain"
          />

          <div className="mt-9 rounded-xl border border-line bg-card p-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-3">
              Nghiệm thu Trạm đổi pin
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Đăng nhập</h1>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              <Field label="Tên đăng nhập">
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

              <Button type="submit" className="mt-2" disabled={dangGui}>
                {dangGui ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
