import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (username === 'admin' && password === 'admin') {
      sessionStorage.setItem('admin_auth', 'true');
      onLogin();
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🚌</div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
          <p className="text-gray-500 text-sm">TransitTicket Management</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Username</Label>
            <Input value={username} onChange={e => setUsername(e.target.value)} placeholder="admin" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button onClick={handleLogin} className="w-full bg-slate-800 hover:bg-slate-700">Login</Button>
        </div>
      </div>
    </div>
  );
}