'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaTimesCircle, FaEnvelope, FaHome } from 'react-icons/fa';

export default function RejectedPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 text-center border border-gray-700">
                {/* Icon */}
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaTimesCircle className="text-4xl text-red-500" />
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-white mb-4">
                    تم رفض طلبك
                </h1>

                {/* Description */}
                <p className="text-gray-400 mb-6 leading-relaxed">
                    نأسف، تم رفض طلب تسجيلك.
                    <br />
                    إذا كنت تعتقد أن هذا خطأ، يرجى التواصل معنا.
                </p>

                {/* Status Card */}
                <div className="bg-gray-900/50 rounded-xl p-4 mb-6">
                    <div className="flex items-center justify-center gap-2 text-red-500">
                        <FaEnvelope />
                        <span className="text-sm">تم رفض الطلب</span>
                    </div>
                </div>

                {/* Home Button */}
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center justify-center gap-2 w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors"
                >
                    <FaHome />
                    <span>العودة للصفحة الرئيسية</span>
                </button>
            </div>
        </div>
    );
}
