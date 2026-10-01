import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  Mic,
  Square,
  Trash2,
  Image as ImageIcon,
  Volume2,
  Sparkles,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  FileText,
  Plus,
} from 'lucide-react';
import { VocabItem, GrammarItem, WordType } from '../types';
import { getTodayDate, addDays } from '../utils/fsrs';
import { fileToDataUrl, speakText, stopCurrentAudio } from '../utils/audio';

interface AddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveVocab: (item: Partial<VocabItem>) => void;
  onSaveGrammar: (item: Partial<GrammarItem>) => void;
  editingItem?: { type: 'vocab' | 'grammar'; data: VocabItem | GrammarItem } | null;
  vocabCount?: number;
  grammarCount?: number;
  existingTopics?: string[];
}

export const AddEditModal: React.FC<AddEditModalProps> = ({
  isOpen,
  onClose,
  onSaveVocab,
  onSaveGrammar,
  editingItem,
}) => {
  const [activeTab, setActiveTab] = useState<'vocab' | 'grammar'>('vocab');
  const formRef = useRef<HTMLFormElement>(null);

  // Vocab fields
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [meaning, setMeaning] = useState('');
  const [wordType, setWordType] = useState<WordType>('n');
  const [topic, setTopic] = useState('');
  const [example, setExample] = useState('');
  const [exampleVi, setExampleVi] = useState('');
  const [vocabReviewDate, setVocabReviewDate] = useState(getTodayDate());

  // Grammar fields
  const [grammarTitle, setGrammarTitle] = useState('');
  const [grammarType, setGrammarType] = useState('Thì (Tense)');
  const [grammarFormula, setGrammarFormula] = useState('');
  const [grammarExplanation, setGrammarExplanation] = useState('');
  const [grammarExample, setGrammarExample] = useState('');
  const [grammarExampleVi, setGrammarExampleVi] = useState('');
  const [grammarReviewDate, setGrammarReviewDate] = useState(getTodayDate());

  // Media fields
  const [imageUrl, setImageUrl] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputImageRef = useRef<HTMLInputElement>(null);
  const fileInputAudioRef = useRef<HTMLInputElement>(null);

  // AI autofill state & modal feedback
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const showModalMsg = (text: string, type: 'error' | 'success' = 'error') => {
    setModalMessage({ type, text });
    if (type === 'success') {
      setTimeout(() => setModalMessage(null), 3500);
    }
  };

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Initialize or reset form on open or editingItem change
  useEffect(() => {
    setModalMessage(null);
    if (!isOpen) {
      stopRecording();
      stopCurrentAudio();
      return;
    }

    if (editingItem) {
      if (editingItem.type === 'vocab') {
        const v = editingItem.data as VocabItem;
        setActiveTab('vocab');
        setWord(v.word || '');
        setPhonetic(v.phonetic || '');
        setMeaning(v.meaning || '');
        setWordType(v.type || 'n');
        setTopic(v.topic || '');
        setExample(v.example || '');
        setExampleVi(v.exampleVi || '');
        setVocabReviewDate(v.reviewDate || getTodayDate());
        setImageUrl(v.imageUrl || '');
        setAudioUrl(v.audioUrl || '');
      } else {
        const g = editingItem.data as GrammarItem;
        setActiveTab('grammar');
        setGrammarTitle(g.title || '');
        setGrammarType(g.type || 'Thì (Tense)');
        setGrammarFormula(g.formula || '');
        setGrammarExplanation(g.explanation || '');
        setGrammarExample(g.example || '');
        setGrammarExampleVi(g.exampleVi || '');
        setGrammarReviewDate(g.reviewDate || getTodayDate());
        setImageUrl(g.imageUrl || '');
        setAudioUrl(g.audioUrl || '');
      }
    } else {
      setWord('');
      setPhonetic('');
      setMeaning('');
      setWordType('n');
      setTopic('');
      setExample('');
      setExampleVi('');
      setVocabReviewDate(getTodayDate());

      setGrammarTitle('');
      setGrammarType('Thì (Tense)');
      setGrammarFormula('');
      setGrammarExplanation('');
      setGrammarExample('');
      setGrammarExampleVi('');
      setGrammarReviewDate(getTodayDate());

      setImageUrl('');
      setAudioUrl('');
    }
  }, [isOpen, editingItem, stopRecording]);

  // Support Clipboard Paste for Image (Ctrl+V directly imports copied image!)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              try {
                const dataUrl = await fileToDataUrl(file);
                setImageUrl(dataUrl);
                showModalMsg('📸 Đã dán ảnh từ bộ nhớ tạm!', 'success');
              } catch (err) {
                console.error(err);
              }
            }
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Keyboard shortcuts: Esc to close, Ctrl+Enter / Cmd+Enter to submit
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  // AI Autofill action
  const handleAutofill = async () => {
    const query = activeTab === 'vocab' ? word.trim() : grammarTitle.trim();
    if (!query) {
      showModalMsg(
        activeTab === 'vocab'
          ? 'Vui lòng nhập Từ tiếng Anh trước khi bấm AI tự động điền.'
          : 'Vui lòng nhập Tên ngữ pháp trước khi bấm AI tự động điền.'
      );
      return;
    }

    setIsAutofilling(true);
    setModalMessage(null);
    try {
      const res = await fetch('/api/ai/lookup-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, type: activeTab }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        if (activeTab === 'vocab') {
          if (data.data.phonetic) setPhonetic(data.data.phonetic);
          if (data.data.meaning) setMeaning(data.data.meaning);
          if (data.data.wordType) setWordType(data.data.wordType);
          if (data.data.topic) setTopic(data.data.topic);
          if (data.data.example) setExample(data.data.example);
          if (data.data.exampleVi) setExampleVi(data.data.exampleVi);
          showModalMsg(`✨ AI đã điền chi tiết cho từ "${query}"!`, 'success');
        } else {
          if (data.data.grammarType) setGrammarType(data.data.grammarType);
          if (data.data.formula) setGrammarFormula(data.data.formula);
          if (data.data.explanation) setGrammarExplanation(data.data.explanation);
          if (data.data.example) setGrammarExample(data.data.example);
          if (data.data.exampleVi) setGrammarExampleVi(data.data.exampleVi);
          showModalMsg(`✨ AI đã điền công thức & giải thích cho "${query}"!`, 'success');
        }
      } else {
        showModalMsg('Không thể tự động điền. Bạn có thể tự nhập thủ công.');
      }
    } catch {
      showModalMsg('Lỗi kết nối khi gửi yêu cầu AI.');
    } finally {
      setIsAutofilling(false);
    }
  };

  // Image file handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setImageUrl(dataUrl);
      showModalMsg('Đã tải ảnh lên thành công!', 'success');
    } catch {
      showModalMsg('Không thể đọc file ảnh. Vui lòng thử lại với ảnh khác.');
    }
  };

  // Audio file handler
  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setAudioUrl(dataUrl);
      showModalMsg('Đã tải file âm thanh thành công!', 'success');
    } catch {
      showModalMsg('Không thể đọc file audio. Vui lòng thử lại.');
    }
  };

  // Voice recording handler
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showModalMsg('Trình duyệt chưa hỗ trợ ghi âm trực tiếp.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result as string);
          showModalMsg('Đã ghi âm thành công!', 'success');
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error(err);
      showModalMsg('Không thể truy cập microphone. Vui lòng cấp quyền.');
    }
  };

  // Pronunciation preview
  const handleSpeak = (textToSpeak: string) => {
    if (textToSpeak && textToSpeak.trim()) {
      speakText(textToSpeak.trim());
    } else {
      showModalMsg('Vui lòng nhập nội dung trước khi bấm nghe.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'vocab') {
      if (!word.trim() || !meaning.trim()) {
        showModalMsg('Vui lòng nhập Từ tiếng Anh và Nghĩa tiếng Việt.');
        return;
      }

      onSaveVocab({
        ...(editingItem?.data as VocabItem),
        word: word.trim(),
        phonetic: phonetic.trim(),
        meaning: meaning.trim(),
        type: wordType,
        topic: topic.trim() || 'Chung',
        example: example.trim(),
        exampleVi: exampleVi.trim(),
        imageUrl: imageUrl.trim() || undefined,
        audioUrl: audioUrl.trim() || undefined,
        reviewDate: vocabReviewDate,
      });
    } else {
      if (!grammarTitle.trim() || !grammarFormula.trim() || !grammarExplanation.trim()) {
        showModalMsg('Vui lòng nhập Tên, Công thức và Giải thích ngữ pháp.');
        return;
      }

      onSaveGrammar({
        ...(editingItem?.data as GrammarItem),
        title: grammarTitle.trim(),
        type: grammarType.trim(),
        formula: grammarFormula.trim(),
        explanation: grammarExplanation.trim(),
        example: grammarExample.trim(),
        exampleVi: grammarExampleVi.trim(),
        imageUrl: imageUrl.trim() || undefined,
        audioUrl: audioUrl.trim() || undefined,
        reviewDate: grammarReviewDate,
      });
    }

    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      id="modal-add-edit"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal Dialog with elegant, slightly darker slate tone */}
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-750 sm:border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl m-auto overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] text-slate-100">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`p-2 rounded-xl text-white shadow-xs shrink-0 ${
                activeTab === 'vocab'
                  ? 'bg-emerald-600'
                  : 'bg-indigo-600'
              }`}
            >
              {activeTab === 'vocab' ? <BookOpen size={18} /> : <FileText size={18} />}
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight truncate">
                {editingItem
                  ? editingItem.type === 'vocab'
                    ? 'Chỉnh sửa từ vựng'
                    : 'Chỉnh sửa ngữ pháp'
                  : 'Thêm mới vào kho kiến thức'}
              </h2>
              <p className="text-xs text-slate-400 font-medium truncate">
                Ôn tập ngắt quãng FSRS v4
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal notification banner */}
        {modalMessage && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between gap-2 border-b animate-fade-in shrink-0 ${
              modalMessage.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
                : 'bg-rose-950/60 border-rose-800 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {modalMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-rose-400 shrink-0" />
              )}
              <span>{modalMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setModalMessage(null)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tab Switcher (Old clean segmented layout with dark styling) */}
        {!editingItem && (
          <div className="px-5 pt-3.5 pb-2 bg-slate-950/40 border-b border-slate-800/80 shrink-0">
            <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl gap-1 border border-slate-800">
              <button
                type="button"
                id="tab-add-vocab"
                onClick={() => setActiveTab('vocab')}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'vocab'
                    ? 'bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen size={16} />
                <span>Từ vựng</span>
              </button>

              <button
                type="button"
                id="tab-add-grammar"
                onClick={() => setActiveTab('grammar')}
                className={`flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'grammar'
                    ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText size={16} />
                <span>Ngữ pháp</span>
              </button>
            </div>
          </div>
        )}

        {/* Form Body - Clean, direct inputs with slightly darker palette */}
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-200"
        >
          {activeTab === 'vocab' ? (
            /* =================== VOCABULARY FORM =================== */
            <div className="space-y-4">
              {/* Word + AI Autofill Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <span>Từ tiếng Anh</span>
                    <span className="text-rose-400">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAutofill}
                    disabled={isAutofilling || !word.trim()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-emerald-800/80 transition-colors cursor-pointer"
                  >
                    {isAutofilling ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-emerald-400" />
                        <span>Đang tra cứu...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="text-emerald-400" />
                        <span>AI Tự động điền</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    autoFocus={!editingItem}
                    id="input-vocab-word"
                    value={word}
                    onChange={(e) => setWord(e.target.value)}
                    placeholder="Nhập từ hoặc cụm từ tiếng Anh..."
                    className="w-full pl-3.5 pr-11 py-2.5 text-sm sm:text-base font-bold rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  />
                  {word.trim() && (
                    <button
                      type="button"
                      onClick={() => handleSpeak(word)}
                      className="absolute right-2 p-1.5 text-emerald-400 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
                      title="Nghe phát âm"
                    >
                      <Volume2 size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Phonetic & Word Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Phiên âm IPA
                  </label>
                  <input
                    type="text"
                    id="input-vocab-phonetic"
                    value={phonetic}
                    onChange={(e) => setPhonetic(e.target.value)}
                    placeholder="/.../"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Loại từ
                  </label>
                  <select
                    id="select-vocab-type"
                    value={wordType}
                    onChange={(e) => setWordType(e.target.value as WordType)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="n">Danh từ (n)</option>
                    <option value="v">Động từ (v)</option>
                    <option value="adj">Tính từ (adj)</option>
                    <option value="adv">Trạng từ (adv)</option>
                    <option value="phrase">Cụm từ (phrase)</option>
                    <option value="idiom">Thành ngữ (idiom)</option>
                    <option value="prep">Giới từ (prep)</option>
                    <option value="conj">Liên từ (conj)</option>
                  </select>
                </div>
              </div>

              {/* Meaning & Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Nghĩa tiếng Việt <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="input-vocab-meaning"
                    value={meaning}
                    onChange={(e) => setMeaning(e.target.value)}
                    placeholder="Nghĩa của từ..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Chủ đề
                  </label>
                  <input
                    type="text"
                    id="input-vocab-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="ví dụ: IELTS, Giao tiếp..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Example sentence */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-400">
                    Câu ví dụ tiếng Anh
                  </label>
                  {example.trim() && (
                    <button
                      type="button"
                      onClick={() => handleSpeak(example)}
                      className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      <Volume2 size={12} />
                      <span>Nghe ví dụ</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  id="input-vocab-example"
                  value={example}
                  onChange={(e) => setExample(e.target.value)}
                  placeholder="Example sentence..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Example translation */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Dịch nghĩa câu ví dụ
                </label>
                <input
                  type="text"
                  id="input-vocab-example-vi"
                  value={exampleVi}
                  onChange={(e) => setExampleVi(e.target.value)}
                  placeholder="Dịch nghĩa câu ví dụ..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Review Date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <label className="text-xs font-medium text-slate-400">
                  Ngày bắt đầu ôn tập
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVocabReviewDate(getTodayDate())}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                      vocabReviewDate === getTodayDate()
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => setVocabReviewDate(addDays(getTodayDate(), 1))}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                      vocabReviewDate === addDays(getTodayDate(), 1)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    Ngày mai
                  </button>
                  <input
                    type="date"
                    id="input-vocab-date"
                    value={vocabReviewDate}
                    onChange={(e) => setVocabReviewDate(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* =================== GRAMMAR FORM =================== */
            <div className="space-y-4">
              {/* Grammar Title & AI Autofill */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <span>Tên điểm ngữ pháp</span>
                    <span className="text-rose-400">*</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAutofill}
                    disabled={isAutofilling || !grammarTitle.trim()}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg border border-indigo-800/80 transition-colors cursor-pointer"
                  >
                    {isAutofilling ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-indigo-400" />
                        <span>Đang tra cứu...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={13} className="text-indigo-400" />
                        <span>AI Tự động điền</span>
                      </>
                    )}
                  </button>
                </div>

                <input
                  type="text"
                  required
                  autoFocus={!editingItem}
                  id="input-grammar-title"
                  value={grammarTitle}
                  onChange={(e) => setGrammarTitle(e.target.value)}
                  placeholder="ví dụ: Câu Điều Kiện Loại 3..."
                  className="w-full px-3.5 py-2.5 text-sm sm:text-base font-bold rounded-xl border border-slate-700 bg-slate-950 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Grammar Type */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Phân loại ngữ pháp
                </label>
                <select
                  id="select-grammar-type"
                  value={grammarType}
                  onChange={(e) => setGrammarType(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Thì (Tense)">Thì (Tense)</option>
                  <option value="Cấu trúc (Structure)">Cấu trúc (Structure)</option>
                  <option value="Mệnh đề (Clause)">Mệnh đề (Clause)</option>
                  <option value="Đảo ngữ (Inversion)">Đảo ngữ (Inversion)</option>
                  <option value="Câu bị động (Passive Voice)">Câu bị động (Passive Voice)</option>
                  <option value="Câu điều kiện (Conditionals)">Câu điều kiện (Conditionals)</option>
                  <option value="Từ loại & Giới từ">Từ loại & Giới từ</option>
                  <option value="Ngữ pháp nâng cao">Ngữ pháp nâng cao</option>
                </select>
              </div>

              {/* Formula */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Công thức (Formula) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  id="input-grammar-formula"
                  value={grammarFormula}
                  onChange={(e) => setGrammarFormula(e.target.value)}
                  placeholder="ví dụ: S + had + V3/ed..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-indigo-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Explanation */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Giải thích cách dùng <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  id="textarea-grammar-explanation"
                  value={grammarExplanation}
                  onChange={(e) => setGrammarExplanation(e.target.value)}
                  placeholder="Giải thích cách dùng và lưu ý..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
                />
              </div>

              {/* Example & Translation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Ví dụ minh họa
                  </label>
                  <input
                    type="text"
                    id="input-grammar-example"
                    value={grammarExample}
                    onChange={(e) => setGrammarExample(e.target.value)}
                    placeholder="Example..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Dịch nghĩa ví dụ
                  </label>
                  <input
                    type="text"
                    id="input-grammar-example-vi"
                    value={grammarExampleVi}
                    onChange={(e) => setGrammarExampleVi(e.target.value)}
                    placeholder="Dịch nghĩa..."
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-700 bg-slate-950 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Review Date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <label className="text-xs font-medium text-slate-400">
                  Ngày bắt đầu ôn tập
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGrammarReviewDate(getTodayDate())}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                      grammarReviewDate === getTodayDate()
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrammarReviewDate(addDays(getTodayDate(), 1))}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors cursor-pointer ${
                      grammarReviewDate === addDays(getTodayDate(), 1)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    Ngày mai
                  </button>
                  <input
                    type="date"
                    id="input-grammar-date"
                    value={grammarReviewDate}
                    onChange={(e) => setGrammarReviewDate(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-700 bg-slate-950 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =================== MEDIA (IMAGE & AUDIO) =================== */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Đa phương tiện (Hình ảnh & Âm thanh)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Image Box */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon size={14} className="text-emerald-400" />
                    <span>Ảnh minh họa</span>
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Xóa
                    </button>
                  )}
                </div>

                {imageUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputImageRef.current?.click()}
                      className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
                    >
                      Đổi ảnh khác
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      placeholder="Dán URL ảnh hoặc nhấn Ctrl+V..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-900 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputImageRef.current?.click()}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 cursor-pointer flex items-center gap-1"
                    >
                      <Upload size={12} />
                      <span>Tải</span>
                    </button>
                  </div>
                )}
                <input
                  ref={fileInputImageRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </div>

              {/* Audio Box */}
              <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Volume2 size={14} className="text-indigo-400" />
                    <span>Phát âm & Ghi âm</span>
                  </label>
                  {audioUrl && (
                    <button
                      type="button"
                      onClick={() => setAudioUrl('')}
                      className="text-[11px] text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      Xóa
                    </button>
                  )}
                </div>

                {audioUrl ? (
                  <div className="flex items-center gap-2">
                    <audio src={audioUrl} controls className="h-7 w-full max-w-[200px]" />
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputAudioRef.current?.click()}
                      className="flex-1 px-2 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Upload size={12} />
                      <span>Tệp audio</span>
                    </button>

                    {isRecording ? (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1 animate-pulse cursor-pointer"
                      >
                        <Square size={12} />
                        <span>Dừng ({recordingSeconds}s)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-2.5 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/50 hover:bg-rose-900/50 border border-rose-800/80 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Mic size={12} />
                        <span>Ghi âm</span>
                      </button>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputAudioRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5 sticky bottom-0 bg-slate-900/95 py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              id="btn-submit-item"
              className={`px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 ${
                activeTab === 'vocab'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {editingItem ? <Check size={16} /> : <Plus size={16} />}
              <span>{editingItem ? 'Lưu thay đổi' : 'Thêm vào kho kiến thức'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
