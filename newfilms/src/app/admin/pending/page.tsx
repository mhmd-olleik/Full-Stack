'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheck, FaTimes, FaUser, FaClock, FaArrowRight } from 'react-icons/fa';

interface PendingUser {
    _id: string;
    name: string;
    email: string;
    createdAt: string;
}

export default function PendingUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const fetchPendingUsers = async () => {
        try {
            const res = await fetch('/api/admin/users/pending');
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
            }
        } catch (error) {
            console.error('Error fetching pending users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId: string) => {
        setActionLoading(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}/approve`, {
                method: 'POST',
            });
            if (res.ok) {
                setUsers(users.filter(u => u._id !== userId));
            }
        } catch (error) {
            console.error('Error approving user:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (userId: string) => {
        setActionLoading(userId);
        try {
            const res = await fetch(`/api/admin/users/${userId}/reject`, {
                method: 'POST',
            });
            if (res.ok) {
                setUsers(users.filter(u => u._id !== userId));
            }
        } catch (error) {
            console.error('Error rejecting user:', error);
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="min-h-screen bg-gray-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <FaClock className="text-yellow-500" />
                            طلبات التسجيل المعلقة
                        </h1>
                        <p className="text-gray-400 mt-1">
                            {users.length} طلب في انتظار المراجعة
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/admin')}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                        <FaArrowRight />
                        العودة للوحة التحكم
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-gray-400 mt-4">جاري التحميل...</p>
                    </div>
                )}

                {/* Empty State */}
                {!loading && users.length === 0 && (
                    <div className="bg-gray-800/50 rounded-xl p-12 text-center">
                        <FaUser className="text-5xl text-gray-600 mx-auto mb-4" />
                        <h2 className="text-xl text-gray-400 mb-2">لا توجد طلبات معلقة</h2>
                        <p className="text-gray-500">جميع طلبات التسجيل تمت مراجعتها</p>
                    </div>
                )}

                {/* Users List */}
                {!loading && users.length > 0 && (
                    <div className="space-y-4">
                        {users.map((user) => (
                            <div
                                key={user._id}
                                className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                                            <FaUser className="text-gray-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-semibold">{user.name}</h3>
                                            <p className="text-gray-400 text-sm">{user.email}</p>
                                            <p className="text-gray-500 text-xs mt-1">
                                                تاريخ التسجيل: {formatDate(user.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleApprove(user._id)}
                                            disabled={actionLoading === user._id}
                                            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors"
                                        >
                                            {actionLoading === user._id ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <FaCheck />
                                            )}
                                            قبول
                                        </button>
                                        <button
                                            onClick={() => handleReject(user._id)}
                                            disabled={actionLoading === user._id}
                                            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white px-4 py-2 rounded-lg transition-colors"
                                        >
                                            {actionLoading === user._id ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <FaTimes />
                                            )}
                                            رفض
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
