import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, FileText, CheckCircle, XCircle, Award, ArrowRight, ArrowLeft, Printer, Search, Star, AlertTriangle } from 'lucide-react';
import { questions } from './data/questions';
import { User } from './types';

import { db, collections, auth } from './lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export default function App() {
  const [view, setView] = useState<'home' | 'exam' | 'result' | 'admin'>('home');
  const [user, setUser] = useState<User | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let timer: number;
    if (view === 'exam' && timeRemaining > 0) {
      timer = window.setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && view === 'exam') {
      handleSubmitExam();
    }
    return () => clearInterval(timer);
  }, [view, timeRemaining]);

  const handleStart = (userData: User) => {
    setUser(userData);
    setView('exam');
    setTimeRemaining(30 * 60);
    setAnswers({});
    setCurrentQuestionIndex(0);
  };

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        score += 1;
      }
    });
    return score;
  };

  const handleSubmitExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const correctCount = calculateScore();
    const markPercentage = Math.round((correctCount / questions.length) * 100);
    
    if (db && user) {
      try {
        await addDoc(collection(db, collections.participants), {
          name: user.name,
          ic: user.icNumber,
          email: user.email,
          district: user.district,
          set: user.questionSet.replace('Set ', ''),
          mark: markPercentage,
          correct: correctCount,
          total: questions.length,
          timestamp: Timestamp.now(),
          dateString: new Date().toLocaleString('ms-MY', { 
            day: 'numeric', 
            month: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: true 
          })
        });
      } catch (error) {
        console.error("Error saving result to Firebase:", error);
      }
    }
    
    setIsSubmitting(false);
    setView('result');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-screen ${view === 'admin' ? 'bg-white' : 'bg-slate-50'} flex flex-col font-sans`}>
      {/* Header */}
      {view !== 'admin' && (
        <header className="bg-white shadow-md w-full">
          <div className="w-full">
            <img 
              src="https://i.postimg.cc/7ZJhD4fM/Ujian-Online-Tauliah-Mengajar.jpg" 
              alt="Banner Ujian Online Tauliah Mengajar Agama Islam Negeri Pulau Pinang" 
              className="w-full h-auto object-cover"
            />
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-grow flex flex-col items-center ${view === 'admin' ? 'p-0' : 'p-4 md:p-8'}`}>
        {view === 'home' && (
          <HomeView onStart={handleStart} onAdminLogin={() => setView('admin')} />
        )}

        {view === 'admin' && (
          <AdminView onLogout={() => setView('home')} />
        )}

        {view === 'exam' && (
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-blue-900 text-white px-6 py-4 flex justify-between items-center border-b-4 border-yellow-500">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-400" />
                <span className="font-semibold hidden sm:inline">Soalan {currentQuestionIndex + 1} / {questions.length}</span>
                <span className="font-semibold sm:hidden">{currentQuestionIndex + 1}/{questions.length}</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-lg bg-blue-950 px-3 py-1 rounded-md text-yellow-400">
                <Clock className="w-5 h-5" />
                {formatTime(timeRemaining)}
              </div>
            </div>
            
            <div className="p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-medium text-slate-800 mb-6 leading-relaxed">
                {questions[currentQuestionIndex].text}
              </h2>
              
              <div className="space-y-3">
                {questions[currentQuestionIndex].options.map((option, idx) => (
                  <label 
                    key={idx} 
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      answers[questions[currentQuestionIndex].id] === idx 
                        ? 'border-blue-600 bg-blue-50' 
                        : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name={`question-${questions[currentQuestionIndex].id}`}
                      value={idx}
                      checked={answers[questions[currentQuestionIndex].id] === idx}
                      onChange={() => handleAnswerSelect(questions[currentQuestionIndex].id, idx)}
                      className="mt-1 w-5 h-5 text-blue-700 border-slate-300 focus:ring-blue-600 flex-shrink-0"
                    />
                    <span className="text-slate-700 md:text-lg">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
              <button 
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>
              
              {currentQuestionIndex === questions.length - 1 ? (
                <button 
                  onClick={handleSubmitExam}
                  className="flex items-center gap-2 px-6 py-2 rounded-md font-bold text-blue-900 bg-yellow-400 hover:bg-yellow-500 transition-colors shadow-sm"
                >
                  Hantar <span className="hidden sm:inline">Jawapan</span>
                  <CheckCircle className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-white bg-slate-800 hover:bg-slate-700 transition-colors shadow-sm"
                >
                  Seterusnya
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
            
            {/* Question Navigator */}
            <div className="p-4 border-t border-slate-200 bg-white">
              <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wider">Navigasi Soalan</h3>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-10 h-10 rounded-md font-medium flex items-center justify-center transition-colors ${
                      currentQuestionIndex === idx 
                        ? 'bg-blue-800 text-white border-2 border-blue-800'
                        : answers[q.id] !== undefined
                          ? 'bg-blue-100 text-blue-900 border border-blue-300'
                          : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === 'result' && user && (
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg p-8 text-center mt-4">
            <Award className="w-20 h-20 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Keputusan Ujian</h2>
            <div className="bg-slate-50 rounded-lg p-6 my-6 border border-slate-200 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 border-b border-slate-200 pb-4">
                <div className="text-slate-500 font-medium">Nama</div>
                <div className="sm:col-span-2 font-semibold text-slate-800 uppercase">{user.name}</div>
                <div className="text-slate-500 font-medium mt-2 sm:mt-0">No. K/P</div>
                <div className="sm:col-span-2 font-semibold text-slate-800">{user.icNumber}</div>
              </div>
              <div className="flex justify-between items-center mt-6">
                <div className="text-lg text-slate-600 font-medium">Markah Anda:</div>
                <div className="text-4xl font-black text-blue-800">{calculateScore()} / {questions.length}</div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                <div className="text-lg text-slate-600 font-medium">Status:</div>
                {calculateScore() >= (questions.length * 0.8) ? (
                  <div className="text-2xl font-bold text-blue-800 px-4 py-1 bg-blue-100 rounded-full flex items-center gap-2">
                    <CheckCircle className="w-6 h-6" /> LULUS
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-red-600 px-4 py-1 bg-red-100 rounded-full flex items-center gap-2">
                    <XCircle className="w-6 h-6" /> GAGAL
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-slate-500 mb-8 px-4">
              {calculateScore() >= (questions.length * 0.8) 
                ? "Tahniah! Anda telah berjaya melepasi ujian ini dengan cemerlang." 
                : "Dukacita dimaklumkan anda tidak melepasi markah lulus minimum (80%). Sila cuba lagi untuk mendapatkan sijil tauliah mengajar."}
            </p>
            
            <button 
              onClick={() => {
                setView('home');
                setUser(null);
              }}
              className="px-6 py-3 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors shadow-md w-full sm:w-auto"
            >
              Kembali ke Laman Utama
            </button>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-slate-800 text-slate-400 py-6 text-center text-sm px-4">
        <p>&copy; {new Date().getFullYear()} Jabatan Hal Ehwal Agama Islam Pulau Pinang. Hak Cipta Terpelihara.</p>
        <p className="mt-1">Sistem Ujian Online Tauliah Mengajar Agama Islam</p>
      </footer>
    </div>
  );
}

function HomeView({ onStart, onAdminLogin }: { onStart: (user: User) => void, onAdminLogin: () => void }) {
  const [name, setName] = useState('');
  const [icNumber, setIcNumber] = useState('');
  const [email, setEmail] = useState('');
  const [district, setDistrict] = useState('');
  const [date, setDate] = useState('');
  const [questionSet, setQuestionSet] = useState('');
  const [error, setError] = useState('');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !icNumber.trim() || !email.trim() || !district || !date || !questionSet) {
      setError('Sila isikan semua maklumat yang diperlukan.');
      return;
    }
    
    // Simple validation for IC
    if (icNumber.replace(/[^0-9]/g, '').length !== 12) {
      setError('Sila masukkan nombor kad pengenalan yang sah (12 digit).');
      return;
    }
    
    setError('');
    onStart({ name, icNumber, email, district, date, questionSet });
  };

  const handleGoogleLogin = async () => {
    if (!auth) {
      alert('Sistem log masuk tidak dikonfigurasi dengan betul. Sila semak tetapan Firebase anda.');
      return;
    }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAdminModal(false);
      onAdminLogin();
    } catch (error: any) {
      console.error('Ralat log masuk Google:', error);
      alert('Gagal log masuk dengan Google: ' + error.message);
    }
  };

  const handleAdminAccess = () => {
    if (adminPassword === 'admin123') {
      setShowAdminModal(false);
      setAdminPassword('');
      onAdminLogin();
    } else {
      alert('Kata laluan tidak sah. Sila cuba lagi. (Petunjuk sementara: admin123)');
    }
  };

  return (
    <div className="w-full max-w-4xl flex flex-col items-center">
      <div className="w-full bg-white rounded-xl shadow-lg mt-4 md:mt-8">
        <div className="bg-blue-600 p-8 text-center rounded-t-xl">
          <h2 className="text-3xl font-bold text-white mb-2">Ujian Online</h2>
          <p className="text-blue-100 text-lg">Tauliah Mengajar Agama Islam P.Pinang</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-slate-700 mb-1">
              Nama Penuh <span className="text-red-500 font-normal text-xs ml-1">*Ikut ejaan Kad Pengenalan</span>
            </label>
            <input 
              type="text" 
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700"
              placeholder="MUHAMMAD BIN ABDULLAH"
              autoComplete="name"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="icNumber" className="block text-sm font-bold text-slate-700 mb-1">
                No. Kad Pengenalan
              </label>
              <input 
                type="text" 
                id="icNumber"
                value={icNumber}
                onChange={(e) => setIcNumber(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700"
                placeholder="Cth: 912345678901 (Tanpa -)"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1">
                Emel Peserta <span className="text-blue-500 font-normal text-xs ml-1">*Untuk terima keputusan</span>
              </label>
              <input 
                type="email" 
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700"
                placeholder="contoh@gmail.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="district" className="block text-sm font-bold text-slate-700 mb-1">
                Daerah / Pusat Ujian
              </label>
              <select 
                id="district"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700 appearance-none"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M8 9l4-4 4 4m0 6l-4 4-4-4\' /%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
              >
                <option value="">-- Pilih Daerah --</option>
                <option value="Timur Laut">Timur Laut</option>
                <option value="Barat Daya">Barat Daya</option>
                <option value="Seberang Perai Utara">Seberang Perai Utara</option>
                <option value="Seberang Perai Tengah">Seberang Perai Tengah</option>
                <option value="Seberang Perai Selatan">Seberang Perai Selatan</option>
              </select>
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-bold text-slate-700 mb-1">
                Tarikh Ujian <span className="text-red-500 font-normal text-xs ml-1">*Pilih hari ini</span>
              </label>
              <input 
                type="date" 
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700"
              />
            </div>
          </div>

          <div>
            <label htmlFor="questionSet" className="block text-sm font-bold text-slate-700 mb-1">
              Set Soalan
            </label>
            <select 
              id="questionSet"
              value={questionSet}
              onChange={(e) => setQuestionSet(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-slate-700 appearance-none font-medium"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%233b82f6\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M8 9l4-4 4 4m0 6l-4 4-4-4\' /%3E%3C/svg%3E")', backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
            >
              <option value="">-- Sila Pilih Set --</option>
              <option value="Set A">Set A</option>
              <option value="Set B">Set B</option>
              <option value="Set C">Set C</option>
            </select>
          </div>
          
          <div className="pt-2 flex flex-col items-center">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Keputusan penuh akan diemelkan kepada anda sebaik sahaja selesai menjawab.</span>
            </div>
            
            <button 
              type="submit"
              className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 font-bold text-lg transition-colors"
            >
              Mula Menjawab
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-8 mb-4">
        <button 
          type="button"
          onClick={() => setShowAdminModal(true)}
          className="text-slate-400 font-semibold hover:text-slate-600 border-b border-dashed border-slate-400 hover:border-slate-600 pb-1 transition-colors cursor-pointer"
        >
          Akses Platform Admin Daerah
        </button>
      </div>

      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[480px] overflow-hidden">
            <div className="p-8">
              <h3 className="text-3xl font-bold text-slate-900 mb-3">Akses Admin</h3>
              <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                Sila masukkan kata laluan daerah anda untuk meneruskan.
              </p>
              
              <input 
                type="password"
                placeholder="Kata Laluan"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700 text-lg mb-8"
              />
              
              <div className="flex gap-4 mb-8">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAdminModal(false);
                    setAdminPassword('');
                  }}
                  className="flex-1 py-4 bg-slate-100 text-slate-800 font-bold rounded-2xl hover:bg-slate-200 transition-colors text-xl"
                >
                  Batal
                </button>
                <button 
                  type="button"
                  onClick={handleAdminAccess}
                  className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-colors text-xl shadow-lg shadow-blue-600/30"
                >
                  Akses
                </button>
              </div>

              <div className="pt-8 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 py-4 border-2 border-slate-100 rounded-2xl hover:bg-slate-50 transition-colors font-semibold text-slate-700 text-lg"
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Teruskan dengan Gmail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const mockParticipants = [
  { id: 1, name: "BATRISYIA BINTI AHMAD SHUKRI", ic: "981022075574", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:32:24 PTG", set: "1", mark: 93, correct: 28, total: 30 },
  { id: 2, name: "MUHAMMAD AIMAN IZZAT BIN MD ZUKI", ic: "010903070253", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:32:27 PTG", set: "1", mark: 93, correct: 28, total: 30 },
  { id: 3, name: "NUHAA AQIL BINTI JAMALUDDIN", ic: "000918070302", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:32:38 PTG", set: "1", mark: 93, correct: 28, total: 30 },
  { id: 4, name: "MUHAMMAD RIDHUAN ZAHARI BIN MOHAMAD RAFI", ic: "000429102019", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:33:39 PTG", set: "1", mark: 93, correct: 28, total: 30 },
  { id: 5, name: "AINA ADRIANA BINTI AHMAD DASIMAN", ic: "030826070214", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:32:44 PTG", set: "1", mark: 90, correct: 27, total: 30 },
  { id: 6, name: "RAFIQAH NAJWA BINTI ROSHDI", ic: "971023095068", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:32:35 PTG", set: "1", mark: 90, correct: 27, total: 30 },
  { id: 7, name: "NURULNAJIHAH BINTI CHE MURET", ic: "010527021094", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:31:38 PTG", set: "1", mark: 90, correct: 27, total: 30 },
  { id: 8, name: "NADIAH HIDAYAH BINTI AZIAN", ic: "020712070372", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:32:08 PTG", set: "1", mark: 87, correct: 26, total: 30 },
  { id: 9, name: "MOHAMAD AMIRUL KHUZAIHAN BIN SUXKARIA", ic: "020708070337", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:32:00 PTG", set: "1", mark: 87, correct: 26, total: 30 },
  { id: 10, name: "ZABA LUTFIL HADI BIN ZABARUDIN", ic: "970804355139", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:32:58 PTG", set: "1", mark: 87, correct: 26, total: 30 },
  { id: 11, name: "NUR HANIM NAJWA BINTI AZIZUL", ic: "001114140752", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:32:04 PTG", set: "1", mark: 63, correct: 19, total: 30 },
  { id: 12, name: "MOHAMAD ARIF FAHMI BIN KHOIROL ANUAR", ic: "030324070521", district: "Seberang Perai Tengah (SPT)", date: "13/9/2026, 3:33:08 PTG", set: "1", mark: 63, correct: 19, total: 30 },
];

interface ParticipantData {
  id: string;
  name: string;
  ic: string;
  district: string;
  date: string; // Used for display
  set: string;
  mark: number;
  correct: number;
  total: number;
  timestamp?: any;
}

function AdminView({ onLogout }: { onLogout: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchParticipants = async () => {
      setIsLoading(true);
      if (!db) {
        setError("Firebase tidak dikonfigurasi dengan betul. Sila semak tetapan Environment Variables anda.");
        setIsLoading(false);
        return;
      }
      
      try {
        const q = query(collection(db, collections.participants), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const data: ParticipantData[] = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as ParticipantData);
        });
        setParticipants(data);
      } catch (err) {
        console.error("Error fetching participants:", err);
        setError("Ralat semasa mengambil data daripada pangkalan data.");
        // Fallback to mock data if there's an error so the UI still renders
        setParticipants(mockParticipants as any);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchParticipants();
  }, []);

  const sortedParticipants = [...participants].sort((a, b) => b.mark - a.mark);
  const top10 = sortedParticipants.slice(0, 10);
  const fails = participants.filter(p => p.correct < 24);

  const averageMark = participants.length > 0 
    ? Math.round(participants.reduce((sum, p) => sum + p.mark, 0) / participants.length)
    : 0;

  return (
    <div className="w-full max-w-5xl mx-auto bg-white min-h-screen p-4 md:p-8 font-sans">
      {/* Rest of the UI remains the same */}
      <div className="text-center mb-10 mt-4 border-b border-slate-100 pb-8">
        <h1 className="text-3xl font-bold text-slate-400 mb-2">Ujian Online</h1>
        <p className="text-lg text-slate-400">Tauliah Mengajar Agama Islam P.Pinang</p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Dashboard Admin</h2>
          <p className="text-blue-700 font-bold text-lg mt-1">Akses: Keseluruhan Daerah</p>
        </div>
        <button onClick={onLogout} className="text-red-600 font-bold hover:text-red-800 mt-4 md:mt-0">
          Log Keluar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p>Sedang memuat turun data rekod...</p>
        </div>
      ) : (
        <>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="font-bold text-slate-700 text-lg">Saringan Tarikh Kursus:</div>
            <div className="flex items-center gap-4">
              <input type="date" className="border border-slate-300 rounded-md px-4 py-2 font-medium bg-white focus:outline-none" />
              <button className="font-bold text-slate-800 hover:text-slate-600">Reset</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-center">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-8">
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Jumlah Peserta</div>
              <div className="text-6xl font-black text-blue-600">{participants.length}</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-8">
              <div className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Purata Markah</div>
              <div className="text-6xl font-black text-emerald-600">{averageMark}%</div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl p-6 mb-12">
            <div className="flex items-center gap-2 text-blue-800 font-bold mb-6 uppercase tracking-wide">
              <Printer className="w-5 h-5" />
              Jana & Muat Turun Laporan
            </div>
            <div className="flex flex-wrap gap-6 items-end">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Kategori Tempoh Masa</label>
                <select className="border border-slate-300 rounded-md px-4 py-2 bg-white font-medium min-w-[200px]">
                  <option>Keseluruhan Masa</option>
                  <option>Harian (Pilih Tarikh)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Tarikh</label>
                <input type="date" className="border border-slate-300 rounded-md px-4 py-2 font-medium bg-white" />
              </div>
              <div className="flex-grow flex flex-col sm:flex-row justify-end gap-4 mt-4 sm:mt-0">
                 <button className="border-2 border-slate-200 text-slate-400 font-bold px-6 py-2 rounded-lg opacity-50 cursor-not-allowed">Muat Turun PDF</button>
                 <button className="border-2 border-emerald-600 text-emerald-700 font-bold px-6 py-2 rounded-lg hover:bg-emerald-50">Muat Turun EXCEL (CSV)</button>
              </div>
            </div>
            <p className="text-sm text-blue-500 mt-6">* Laporan yang dimuat turun akan merujuk kepada <span className="font-bold underline">Saringan Daerah</span> di atas. Jika fail PDF tidak terhasil, sila guna Muat Turun EXCEL (Jauh lebih sesuai untuk semakan petugas).</p>
          </div>

          <div className="mb-12">
            <div className="flex items-center gap-2 text-yellow-600 font-bold mb-4 uppercase tracking-wide">
              <Star className="w-5 h-5 fill-yellow-500" />
              10 Pelajar Terbaik <span className="text-slate-500 font-medium capitalize">(Saringan Semasa)</span>
            </div>
            
            <div className="border-t-2 border-yellow-200 border-b-2 border-yellow-200 bg-yellow-50/30 overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-yellow-100">
                    <th className="py-4 px-4 font-bold text-slate-700 w-24">RANK</th>
                    <th className="py-4 px-4 font-bold text-slate-700">NAMA PELAJAR</th>
                    <th className="py-4 px-4 font-bold text-slate-700 w-24">SET</th>
                    <th className="py-4 px-4 font-bold text-slate-700 w-32">MARKAH/BETUL</th>
                  </tr>
                </thead>
                <tbody>
                  {top10.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-500">Tiada rekod pelajar lagi.</td></tr>
                  ) : top10.map((p, i) => (
                    <tr key={p.id} className="border-b border-yellow-100/50 last:border-0 hover:bg-yellow-50/80">
                      <td className="py-4 px-4 font-bold text-slate-500 text-center flex justify-center items-center h-full">
                        {i === 0 ? <Award className="w-6 h-6 text-yellow-500" /> : 
                         i === 1 ? <Award className="w-6 h-6 text-slate-400" /> : 
                         i === 2 ? <Award className="w-6 h-6 text-amber-600" /> : 
                         <span className="text-lg">{i + 1}</span>}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800 uppercase">{p.name}</div>
                        <div className="text-sm text-slate-500">KP: {p.ic}</div>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-700">Set<br/>{p.set}</td>
                      <td className="py-4 px-4 font-bold">
                        <div className="text-lg text-emerald-600">{p.mark}%</div>
                        <div className="text-sm text-slate-500">B: {p.correct}/{p.total}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-12">
            <div className="flex items-center gap-2 text-red-600 font-bold mb-4 uppercase tracking-wide">
              <AlertTriangle className="w-5 h-5" />
              Perhatian: Markah Bawah 24 Betul (Gagal)
            </div>
            
            {fails.length === 0 ? (
              <div className="border border-pink-100 bg-pink-50 text-slate-600 italic px-6 py-4 rounded-lg">
                Syabas! Tiada pelajar mendapat markah bawah 24.
              </div>
            ) : (
              <div className="border-t-2 border-red-200 border-b-2 border-red-200 bg-red-50/30 overflow-x-auto">
                 <table className="w-full text-left min-w-[600px]">
                  <thead>
                    <tr className="border-b border-red-100">
                      <th className="py-4 px-4 font-bold text-red-700">NAMA PELAJAR</th>
                      <th className="py-4 px-4 font-bold text-red-700">NO. KP & DAERAH</th>
                      <th className="py-4 px-4 font-bold text-red-700 w-24">SET</th>
                      <th className="py-4 px-4 font-bold text-red-700 w-32">BETUL / %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fails.map(p => (
                      <tr key={p.id} className="border-b border-red-100/50 hover:bg-red-50/80">
                        <td className="py-4 px-4 font-bold text-slate-800">{p.name}</td>
                        <td className="py-4 px-4">
                          <div className="text-slate-800 font-medium">{p.ic}</div>
                          <div className="text-blue-600 font-medium text-sm">{p.district}</div>
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-700">Set<br/>{p.set}</td>
                        <td className="py-4 px-4 font-bold text-red-600">
                          <div className="text-lg">{p.mark}%</div>
                          <div className="text-sm text-slate-500">B: {p.correct}/{p.total}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mb-12">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
              <div className="font-bold uppercase tracking-wide flex items-center gap-4">
                <span className="text-slate-800 text-lg">Senarai Keseluruhan Peserta</span>
                <span className="text-blue-600 font-black">{participants.length} Rekod</span>
              </div>
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Cari Nama atau No. KP..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-3 border border-slate-300 rounded-lg w-full md:w-80 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                />
              </div>
            </div>
            
            <div className="border-t-2 border-slate-200 border-b-2 border-slate-200 bg-white overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="py-4 px-4 font-bold text-slate-600 w-16 text-center">BIL.</th>
                    <th className="py-4 px-4 font-bold text-slate-600">NAMA PELAJAR</th>
                    <th className="py-4 px-4 font-bold text-slate-600">NO. KP & DAERAH</th>
                    <th className="py-4 px-4 font-bold text-slate-600 w-24">SET</th>
                    <th className="py-4 px-4 font-bold text-slate-600 w-24">MARKAH</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-slate-500">Tiada rekod setakat ini.</td></tr>
                  ) : participants
                    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.ic.includes(searchQuery))
                    .map((p, i) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="py-4 px-4 font-bold text-slate-700 text-center">{i + 1}</td>
                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800 uppercase">{p.name}</div>
                        <div className="text-sm text-slate-500 mt-1">{p.date || p.dateString || '-'}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-slate-600 font-medium">{p.ic}</div>
                        <div className="text-blue-600 font-medium text-sm leading-tight mt-1">
                          {p.district ? (p.district.includes('(') ? (
                            <>
                              {p.district.split(' (')[0]}<br/>({p.district.split('(')[1]}
                            </>
                          ) : p.district) : '-'}
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-slate-700">Set<br/>{p.set}</td>
                      <td className={`py-4 px-4 font-bold text-lg ${p.mark >= 80 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {p.mark}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}