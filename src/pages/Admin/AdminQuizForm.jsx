import { ArrowLeft, Save } from 'lucide-react';
import LoadingTransition from '../../components/Common/LoadingTransition';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createQuiz, getQuizById, updateQuiz } from '../../services/quizService';
import { useAuth } from '../../context/AuthContext';
import './Admin.css';

const AdminQuizForm = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!quizId;
  const [loading, setLoading] = useState(isEditMode);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration: 30,
    totalMarks: 100,
    status: 'draft',
    targetAudience: {
      yearId: 'all',
      semesterId: 'all',
      department: 'all'
    },
    settings: {
      randomizeQuestions: false,
      randomizeOptions: false,
      negativeMarking: false,
      negativeMarksPerQuestion: 0
    }
  });

  useEffect(() => {
    if (isEditMode) {
      fetchQuiz();
    }
  }, [quizId]);

  const fetchQuiz = async () => {
    try {
      const data = await getQuizById(quizId);
      if (data) {
        setFormData(data);
      } else {
        navigate('/admin/quizzes'); // Not found
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditMode) {
        await updateQuiz(quizId, formData);
      } else {
        await createQuiz(formData, user?.uid || 'admin');
      }
      navigate('/admin/quizzes');
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert('Error saving quiz. Please try again.');
      setLoading(false);
    }
  };

  if (loading) return <LoadingTransition message="Processing..." />;

  return (
    <div className="admin-container">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/admin/quizzes')} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Quiz' : 'Create New Quiz'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 max-w-3xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quiz Title</label>
            <input 
              type="text" 
              name="title" 
              value={formData.title} 
              onChange={handleChange} 
              required 
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows="3"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
            <input 
              type="number" 
              name="duration" 
              value={formData.duration} 
              onChange={handleChange} 
              required 
              min="1"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Marks</label>
            <input 
              type="number" 
              name="totalMarks" 
              value={formData.totalMarks} 
              onChange={handleChange} 
              required 
              min="1"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              name="status" 
              value={formData.status} 
              onChange={handleChange} 
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Target Audience</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
           <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select name="targetAudience.yearId" value={formData.targetAudience.yearId} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded">
              <option value="all">All</option>
              <option value="puc1">PUC 1</option>
              <option value="puc2">PUC 2</option>
              <option value="e1">Engineering 1</option>
              <option value="e2">Engineering 2</option>
              <option value="e3">Engineering 3</option>
              <option value="e4">Engineering 4</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select name="targetAudience.department" value={formData.targetAudience.department} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded">
              <option value="all">All</option>
              <option value="cse">CSE</option>
              <option value="ece">ECE</option>
              <option value="mech">MECH</option>
              <option value="civil">CIVIL</option>
              <option value="mme">MME</option>
              <option value="chemical">CHEM</option>
            </select>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-4 border-b pb-2">Advanced Settings</h3>
        <div className="space-y-3 mb-8">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="settings.randomizeQuestions" checked={formData.settings.randomizeQuestions} onChange={handleChange} className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">Randomize Question Order</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="settings.randomizeOptions" checked={formData.settings.randomizeOptions} onChange={handleChange} className="w-4 h-4 text-blue-600" />
            <span className="text-gray-700">Randomize Options</span>
          </label>
          <div className="flex items-center gap-4">
             <label className="flex items-center gap-2">
                <input type="checkbox" name="settings.negativeMarking" checked={formData.settings.negativeMarking} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                <span className="text-gray-700">Enable Negative Marking</span>
            </label>
            {formData.settings.negativeMarking && (
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Marks deducted per wrong answer:</span>
                    <input type="number" step="0.5" min="0" name="settings.negativeMarksPerQuestion" value={formData.settings.negativeMarksPerQuestion} onChange={handleChange} className="w-20 p-1 border rounded" />
                </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={() => navigate('/admin/quizzes')} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2">
            <Save size={18} /> {isEditMode ? 'Update Quiz' : 'Save Quiz'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminQuizForm;
