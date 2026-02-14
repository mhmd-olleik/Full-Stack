'use client';

import { useState, useEffect } from 'react';

interface User {
    _id: string;
    name: string;
    email: string;
    role: string;
    isBanned: boolean;
    createdAt: string;
    lastActive: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/admin/users');
            if (!res.ok) throw new Error('فشل في تحميل المستخدمين');
            const data = await res.json();
            setUsers(data.users || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBanUser = async (userId: string, isBanned: boolean) => {
        setActionLoading(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isBanned: !isBanned }),
            });
            if (!res.ok) throw new Error('فشل في تحديث المستخدم');
            await fetchUsers();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'حدث خطأ');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
        setActionLoading(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('فشل في حذف المستخدم');
            await fetchUsers();
            setSelectedUser(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'حدث خطأ');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter =
            filter === 'all' ||
            (filter === 'admin' && user.role === 'admin') ||
            (filter === 'banned' && user.isBanned) ||
            (filter === 'active' && !user.isBanned);

        return matchesSearch && matchesFilter;
    });

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">جاري تحميل المستخدمين...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">إدارة المستخدمين</h1>
                    <p className="text-gray-400 mt-1">عدد المستخدمين: {users.length}</p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="btn-secondary flex items-center gap-2 w-fit"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    تحديث
                </button>
            </div>

            {/* Filters */}
            <div className="glass rounded-xl p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="بحث بالاسم أو البريد..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-field"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {['all', 'active', 'banned', 'admin'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                    ? 'bg-red-600 text-white'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                        >
                            {f === 'all' && 'الكل'}
                            {f === 'active' && 'نشط'}
                            {f === 'banned' && 'محظور'}
                            {f === 'admin' && 'مشرف'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Users Table */}
            <div className="glass rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-sm">
                                <th className="text-right px-6 py-4 font-medium">المستخدم</th>
                                <th className="text-right px-6 py-4 font-medium">الدور</th>
                                <th className="text-right px-6 py-4 font-medium">الحالة</th>
                                <th className="text-right px-6 py-4 font-medium">تاريخ التسجيل</th>
                                <th className="text-right px-6 py-4 font-medium">آخر نشاط</th>
                                <th className="text-right px-6 py-4 font-medium">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                        لا توجد نتائج
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user._id}
                                        className="hover:bg-white/5 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{user.name}</p>
                                                    <p className="text-gray-400 text-sm">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'admin'
                                                        ? 'bg-purple-500/20 text-purple-400'
                                                        : 'bg-blue-500/20 text-blue-400'
                                                    }`}
                                            >
                                                {user.role === 'admin' ? 'مشرف' : 'مستخدم'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${user.isBanned
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-green-500/20 text-green-400'
                                                    }`}
                                            >
                                                {user.isBanned ? 'محظور' : 'نشط'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">
                                            {formatDate(user.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-400 text-sm">
                                            {formatDate(user.lastActive)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                                                    title="عرض"
                                                >
                                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                {user.role !== 'admin' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleBanUser(user._id, user.isBanned)}
                                                            disabled={actionLoading === user._id}
                                                            className={`p-2 rounded-lg transition-colors ${user.isBanned
                                                                    ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                                                                    : 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400'
                                                                }`}
                                                            title={user.isBanned ? 'إلغاء الحظر' : 'حظر'}
                                                        >
                                                            {actionLoading === user._id ? (
                                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user._id)}
                                                            disabled={actionLoading === user._id}
                                                            className="p-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 text-red-400 transition-colors"
                                                            title="حذف"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User Detail Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="glass rounded-2xl p-6 max-w-md w-full">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">تفاصيل المستخدم</h2>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="text-center mb-6">
                            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto text-white text-3xl font-bold mb-4">
                                {selectedUser.name.charAt(0).toUpperCase()}
                            </div>
                            <h3 className="text-xl font-bold text-white">{selectedUser.name}</h3>
                            <p className="text-gray-400">{selectedUser.email}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-gray-400">الدور</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedUser.role === 'admin'
                                        ? 'bg-purple-500/20 text-purple-400'
                                        : 'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    {selectedUser.role === 'admin' ? 'مشرف' : 'مستخدم'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-gray-400">الحالة</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedUser.isBanned
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-green-500/20 text-green-400'
                                    }`}>
                                    {selectedUser.isBanned ? 'محظور' : 'نشط'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-white/10">
                                <span className="text-gray-400">تاريخ التسجيل</span>
                                <span className="text-white">{formatDate(selectedUser.createdAt)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-gray-400">آخر نشاط</span>
                                <span className="text-white">{formatDate(selectedUser.lastActive)}</span>
                            </div>
                        </div>

                        {selectedUser.role !== 'admin' && (
                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => {
                                        handleBanUser(selectedUser._id, selectedUser.isBanned);
                                        setSelectedUser(null);
                                    }}
                                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${selectedUser.isBanned
                                            ? 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        }`}
                                >
                                    {selectedUser.isBanned ? 'إلغاء الحظر' : 'حظر المستخدم'}
                                </button>
                                <button
                                    onClick={() => handleDeleteUser(selectedUser._id)}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                                >
                                    حذف المستخدم
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
