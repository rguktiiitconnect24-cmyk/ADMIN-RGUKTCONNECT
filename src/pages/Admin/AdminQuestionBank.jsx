import { ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import './Admin.css';

const AdminQuestionBank = () => {
    const { quizId } = useParams();
    const navigate = useNavigate();

    return (
        <div className="admin-container">
             <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/admin/quizzes')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold">Question Bank (Quiz ID: {quizId})</h1>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
                <p>Question management coming soon.</p>
            </div>
        </div>
    );
};

export default AdminQuestionBank;
