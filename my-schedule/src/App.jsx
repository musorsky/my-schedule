import React, { useState, useEffect } from 'react';
import { 
  MoreHorizontal, Sun, CalendarDays, Map, User, 
  ChevronDown, ChevronLeft, ChevronRight, X, 
  RefreshCw, Download, Upload, Plus, Pencil, Building 
} from 'lucide-react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, subMonths, addMonths, isSameDay, isSameMonth, differenceInCalendarWeeks } from 'date-fns';
import { parseSchedule } from './parser';

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
const isRemoteLesson = (lesson) => {
  const searchStr = `${lesson.room || ''} ${lesson.type || ''} ${lesson.subject || ''}`.toLowerCase();
  return searchStr.includes('дист') || searchStr.includes('edu.rguk') || searchStr.includes('портал');
};

const getBreakMinutes = (prevEnd, currStart) => {
  if (!prevEnd || !currStart) return 0;
  const parseTime = (t) => {
    const parts = t.trim().split(':');
    if (parts.length !== 2) return 0;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };
  return parseTime(currStart) - parseTime(prevEnd);
};

const formatBreakTime = (minutes) => {
  if (minutes < 60) return `${minutes} минут`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
};

const getWeekParityStr = (date) => {
  const isSpring = date.getMonth() < 7;
  const currentAcademicYear = isSpring ? date.getFullYear() - 1 : date.getFullYear();
  const septFirst = new Date(currentAcademicYear, 8, 1);
  const weekDiff = differenceInCalendarWeeks(date, septFirst, { weekStartsOn: 1 });
  return weekDiff % 2 !== 0 ? 'even' : 'odd';
};

const isLessonOngoing = (lessonTimeStr, selectedDate, now) => {
  if (!isSameDay(selectedDate, now)) return false;
  
  const [startStr, endStr] = lessonTimeStr.split('-');
  if (!startStr || !endStr) return false;

  const parseToMinutes = (t) => {
    const [h, m] = t.trim().split(':').map(Number);
    return h * 60 + m;
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= parseToMinutes(startStr) && currentMinutes <= parseToMinutes(endStr);
};

const parseRoomInfo = (room) => {
  if (!room) return { building: null, displayRoom: null };
  const str = String(room).trim();
  const match = str.match(/^(\d)(.*)/);
  if (match && str.length >= 3) {
    return {
      building: `${match[1]} корпус`,
      displayRoom: match[2].trim()
    };
  }
  return { building: null, displayRoom: str };
};

export default function App() {
  const [groupsData, setGroupsData] = useState(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Отслеживаем ширину экрана (Desktop или Mobile)
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('scheduleNotes');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [currentNoteKey, setCurrentNoteKey] = useState(null);
  const [currentNoteText, setCurrentNoteText] = useState('');
  const [currentNoteTitle, setCurrentNoteTitle] = useState('');

  // --- ЖИВОЕ ВРЕМЯ ---
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [selectedDate, setSelectedDate] = useState(now);
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(now));
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  useEffect(() => {
    const savedData = localStorage.getItem('scheduleGroupsData');
    const savedIndex = localStorage.getItem('selectedGroupIndex');
    
    if (savedData) {
      setGroupsData(JSON.parse(savedData));
      if (savedIndex) setSelectedGroupIndex(Number(savedIndex));
    }
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const parsedData = await parseSchedule(file);
      if (parsedData.length === 0) throw new Error("Не найдено расписание");
      
      setGroupsData(parsedData);
      setSelectedGroupIndex(0);
      
      localStorage.setItem('scheduleGroupsData', JSON.stringify(parsedData));
      localStorage.setItem('selectedGroupIndex', 0);
    } catch (error) {
      alert("Ошибка при чтении файла. Убедитесь, что это файл расписания.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('scheduleGroupsData');
    localStorage.removeItem('selectedGroupIndex');
    setGroupsData(null);
    setIsMenuOpen(false);
  };

  const handleExportNotes = () => {
    const dataStr = JSON.stringify(notes, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my-schedule-notes.json'; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsMenuOpen(false);
  };

  const handleImportNotes = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedNotes = JSON.parse(event.target.result);
        const mergedNotes = { ...notes, ...importedNotes };
        setNotes(mergedNotes);
        localStorage.setItem('scheduleNotes', JSON.stringify(mergedNotes));
        alert('Заметки успешно импортированы!');
      } catch (err) {
        alert('Ошибка файла. Убедитесь, что это файл .json с вашими заметками.');
      }
    };
    reader.readAsText(file);
    setIsMenuOpen(false);
    e.target.value = null; 
  };

  const handleOpenNote = (lesson, dateKey) => {
    setCurrentNoteKey(dateKey);
    setCurrentNoteTitle(lesson.subject);
    setCurrentNoteText(notes[dateKey] || '');
    setIsNoteModalOpen(true);
  };

  const saveNote = () => {
    const newNotes = { ...notes };
    if (currentNoteText.trim() === '') {
      delete newNotes[currentNoteKey];
    } else {
      newNotes[currentNoteKey] = currentNoteText.trim();
    }
    setNotes(newNotes);
    localStorage.setItem('scheduleNotes', JSON.stringify(newNotes));
    setIsNoteModalOpen(false);
  };

  if (!groupsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-app-bg px-6">
        <div className="w-20 h-20 bg-card-bg rounded-3xl flex items-center justify-center mb-6 shadow-lg">
          <CalendarDays className="text-accent-blue w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Расписание</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">Загрузите Excel-файл со вкладками групп, чтобы начать.</p>
        <label className="relative cursor-pointer bg-accent-blue text-black font-semibold py-4 px-8 rounded-2xl w-full max-w-xs text-center transition active:scale-95">
          {loading ? "Обработка..." : "Выбрать Excel-файл"}
          <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
        </label>
      </div>
    );
  }

  const currentGroup = groupsData[selectedGroupIndex];
  
  // Умный расчет отображения календаря. На десктопе он раскрыт всегда.
  const showMonthView = isCalendarExpanded || isDesktop;

  const gridStartDate = showMonthView 
    ? startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 1 }) 
    : startOfWeek(selectedDate, { weekStartsOn: 1 });
    
  const gridEndDate = showMonthView 
    ? endOfWeek(endOfMonth(calendarMonth), { weekStartsOn: 1 }) 
    : endOfWeek(selectedDate, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: gridStartDate, end: gridEndDate });

  const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const fullDayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const monthsRu = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const monthsRuGenitive = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  const selectedParity = getWeekParityStr(selectedDate);
  const selectedDayOfWeek = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
  const currentSchedule = currentGroup.schedule[selectedParity][selectedDayOfWeek] || [];

  const formattedHeaderDate = `${fullDayNames[selectedDayOfWeek - 1]}, ${selectedDate.getDate()} ${monthsRuGenitive[selectedDate.getMonth()]}`;
  const parityText = selectedParity === 'even' ? 'Четная неделя' : 'Нечетная неделя';
  const selectedDateString = `${selectedDate.getFullYear()}-${selectedDate.getMonth() + 1}-${selectedDate.getDate()}`;

  return (
    <div className="min-h-screen bg-app-bg pb-12 font-sans selection:bg-accent-blue selection:text-black relative">
      <div className="max-w-6xl mx-auto w-full">
        
        {/* Header */}
        <header className="px-5 lg:px-8 pt-10 pb-6 lg:pb-8 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Расписание</h1>
            <div className="relative inline-block mt-1.5">
              <select 
                className="appearance-none bg-card-bg text-accent-blue text-sm font-semibold py-1.5 pl-3 pr-8 rounded-lg cursor-pointer outline-none focus:ring-1 focus:ring-accent-blue/50"
                value={selectedGroupIndex}
                onChange={(e) => {
                  setSelectedGroupIndex(Number(e.target.value));
                  localStorage.setItem('selectedGroupIndex', Number(e.target.value));
                }}
              >
                {groupsData.map((group, idx) => (
                  <option key={idx} value={idx}>{group.groupName}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-accent-blue pointer-events-none" />
            </div>
          </div>
          
          <div className="relative">
            <button 
              className={`w-10 h-10 rounded-full flex items-center justify-center mt-1 transition-colors ${isMenuOpen ? 'bg-card-bg-light text-white' : 'bg-card-bg text-gray-300'}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <MoreHorizontal size={20} />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)} />
                <div className="absolute right-0 top-14 mt-1 w-64 bg-[#232325] border border-gray-700/50 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <button onClick={handleClear} className="w-full text-left px-4 py-3.5 text-[15px] font-medium text-white hover:bg-white/10 active:bg-white/20 transition-colors flex items-center gap-3">
                    <RefreshCw size={18} className="text-accent-blue" /> Загрузить новое
                  </button>
                  <div className="h-[1px] bg-gray-700/50 mx-4" />
                  <button onClick={handleExportNotes} className="w-full text-left px-4 py-3.5 text-[15px] font-medium text-white hover:bg-white/10 active:bg-white/20 transition-colors flex items-center gap-3">
                    <Download size={18} className="text-gray-400" /> Экспорт заметок
                  </button>
                  <label className="w-full text-left px-4 py-3.5 text-[15px] font-medium text-white hover:bg-white/10 active:bg-white/20 transition-colors flex items-center gap-3 cursor-pointer mb-0">
                    <Upload size={18} className="text-gray-400" /> Импорт заметок
                    <input type="file" accept=".json" className="hidden" onChange={handleImportNotes} />
                  </label>
                </div>
              </>
            )}
          </div>
        </header>

        {/* --- ОСНОВНОЙ КОНТЕНТ (Грид для ПК, колонка для Мобилок) --- */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 px-5 lg:px-8 items-start">
          
          {/* ЛЕВАЯ КОЛОНКА: КАЛЕНДАРЬ */}
          <div className="w-full lg:w-[380px] shrink-0 lg:sticky lg:top-8 z-10">
            <div className="bg-card-bg rounded-3xl p-4 lg:p-5 transition-all overflow-hidden relative shadow-lg">
              
              <div className="flex justify-between items-center mb-4 px-1">
                <button 
                  onClick={() => { if (!isDesktop) setIsCalendarExpanded(!isCalendarExpanded) }} 
                  className={`flex items-center gap-2 font-bold text-lg ${isDesktop ? 'cursor-default' : ''}`}
                >
                  {monthsRu[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
                  {!isDesktop && (
                    <ChevronDown size={18} className={`text-accent-blue transition-transform duration-300 ${isCalendarExpanded ? 'rotate-180' : ''}`} />
                  )}
                </button>
                <div className={`flex gap-2 lg:gap-3 transition-opacity duration-300 ${showMonthView ? 'opacity-100 visible' : 'opacity-0 invisible hidden'}`}>
                  <button onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="w-8 h-8 rounded-full bg-card-bg-light flex items-center justify-center active:scale-95 transition-transform hover:bg-white/10">
                    <ChevronLeft size={18} className="text-white" />
                  </button>
                  <button onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="w-8 h-8 rounded-full bg-card-bg-light flex items-center justify-center active:scale-95 transition-transform hover:bg-white/10">
                    <ChevronRight size={18} className="text-white" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNamesShort.map((dayName, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-400">{dayName}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, idx) => {
                  const isSelected = isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, now);
                  const isCurrentMonth = isSameMonth(date, calendarMonth);
                  
                  const parity = getWeekParityStr(date);
                  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();
                  const daySchedule = currentGroup.schedule[parity][dayOfWeek] || [];
                  const isDayRemote = daySchedule.some(isRemoteLesson);
                  const dots = Array.from({ length: Math.min(daySchedule.length, 5) });

                  let btnClass = 'text-gray-300 bg-transparent hover:bg-card-bg-light';
                  let dotClass = 'bg-gray-500';

                  if (!isCurrentMonth && showMonthView) btnClass = 'text-gray-600 opacity-40 bg-transparent hover:bg-card-bg-light'; 
                  if (isToday && !isSelected) btnClass = 'text-accent-blue bg-accent-blue/10 font-bold'; 

                  if (isSelected) {
                    btnClass = isDayRemote ? 'bg-orange-400 text-black shadow-md shadow-orange-400/20 font-bold' : 'bg-accent-blue text-black shadow-md shadow-accent-blue/20 font-bold hover:bg-accent-blue hover:opacity-90';
                    dotClass = 'bg-black/50';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedDate(date);
                        setCalendarMonth(startOfMonth(date));
                        if (!isDesktop) setIsCalendarExpanded(false); // На ПК календарь не сворачивается
                      }}
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${btnClass}`}
                    >
                      <span className="text-[15px] leading-none mb-1">{date.getDate()}</span>
                      <div className="flex gap-[2.5px] h-[4px]">
                        {dots.length > 0 ? dots.map((_, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${dotClass}`} />
                        )) : (
                          <div className="w-1 h-1 rounded-full bg-transparent" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: РАСПИСАНИЕ НА ДЕНЬ */}
          <div className="w-full flex-1 min-w-0">
            
            {/* Заголовок дня */}
            <div className="mb-5 flex justify-between items-end">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold leading-tight">{formattedHeaderDate}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-sm text-gray-400">{currentSchedule.length > 0 ? `${currentSchedule.length} пар(ы)` : 'Пар нет'}</p>
                  <span className="text-gray-600 text-xs">•</span>
                  <p className="text-sm font-medium text-accent-blue opacity-80">{parityText}</p>
                </div>
              </div>
            </div>

            {/* Список пар */}
            <div className="flex flex-col gap-3">
              {currentSchedule.length === 0 ? (
                <div className="bg-card-bg rounded-3xl p-6 lg:p-8 flex items-center gap-5 mt-2 shadow-sm border border-gray-800/50">
                  <div className="w-14 h-14 rounded-full bg-card-bg-light flex items-center justify-center shrink-0">
                    <Sun className="text-gray-400" size={28} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">В этот день пар нет</h3>
                    <p className="text-sm text-gray-400 mt-1">Можно выдохнуть и отдохнуть!</p>
                  </div>
                </div>
              ) : (
                currentSchedule.map((lesson, idx) => {
                  let breakMin = 0;
                  if (idx > 0) {
                    const prevEnd = currentSchedule[idx - 1].time.split('-')[1];
                    const currStart = lesson.time.split('-')[0];
                    breakMin = getBreakMinutes(prevEnd, currStart);
                  }

                  const isRemote = isRemoteLesson(lesson);
                  const isOngoing = isLessonOngoing(lesson.time, selectedDate, now);
                  const { building, displayRoom } = parseRoomInfo(lesson.room);

                  const noteKey = `${currentGroup.groupName}_${selectedDateString}_${lesson.time}_${lesson.subject}`;
                  const hasNote = !!notes[noteKey];

                  let cardClasses = 'bg-card-bg border border-transparent';
                  if (isRemote) cardClasses = 'bg-orange-500/10 border border-orange-500/20';
                  
                  if (isOngoing) {
                    cardClasses = isRemote 
                      ? 'bg-orange-500/10 border border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.25)]' 
                      : 'bg-card-bg border border-accent-blue shadow-[0_0_15px_rgba(122,159,255,0.25)]';
                  }

                  const timeBadgeClasses = isRemote ? 'bg-orange-500/20 text-orange-400' : 'bg-card-bg-light text-accent-blue';
                  const noteBtnClasses = hasNote ? 'bg-accent-blue/10 text-accent-blue' : 'bg-card-bg-light text-gray-400 hover:text-white';

                  return (
                    <React.Fragment key={idx}>
                      {breakMin > 0 && (
                        <div className="flex items-center justify-center my-2 opacity-80">
                          <div className="h-[1px] flex-1 bg-gray-800"></div>
                          <span className="text-xs text-gray-500 mx-4 font-medium tracking-wide">
                            Перерыв {formatBreakTime(breakMin)}
                          </span>
                          <div className="h-[1px] flex-1 bg-gray-800"></div>
                        </div>
                      )}

                      <div className={`${cardClasses} rounded-3xl p-5 lg:p-6 flex flex-col relative transition-all duration-300 shadow-sm hover:shadow-md`}>
                        <div className="flex justify-between items-start mb-3 lg:mb-4">
                          <span className={`text-sm font-semibold px-3 py-1.5 rounded-lg flex gap-2 ${timeBadgeClasses}`}>
                            {lesson.num && <span className="opacity-80 border-r border-current pr-2">{lesson.num} пара</span>}
                            <span>{lesson.time}</span>
                          </span>
                          {lesson.type && <span className="text-xs font-medium text-gray-400 border border-gray-700 px-2 py-1 rounded-md">{lesson.type}</span>}
                        </div>
                        
                        <h3 className="font-semibold text-[17px] lg:text-[19px] leading-tight mb-2 pr-4">{lesson.subject}</h3>
                        
                        <div className="flex justify-between items-end mt-1">
                          <div className="flex flex-col gap-1.5 lg:gap-2 mt-1 flex-1 pr-3">
                            {lesson.teacher && (
                              <p className="text-sm text-gray-400 flex items-start gap-2.5">
                                <User size={15} className="shrink-0 mt-[2px]" /> 
                                <span className="leading-snug">{lesson.teacher}</span>
                              </p>
                            )}
                            {building && (
                              <p className="text-sm text-gray-400 flex items-start gap-2.5">
                                <Building size={15} className="shrink-0 mt-[2px]" /> 
                                <span className="leading-snug">{building}</span>
                              </p>
                            )}
                            {displayRoom && (
                              <p className="text-sm text-gray-400 flex items-start gap-2.5">
                                <Map size={15} className="shrink-0 mt-[2px]" /> 
                                <span className="leading-snug">{displayRoom}</span>
                              </p>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => handleOpenNote(lesson, noteKey)}
                            className={`px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors shrink-0 ml-1 ${noteBtnClasses}`}
                          >
                            {hasNote ? <Pencil size={14} /> : <Plus size={16} />}
                            <span className="text-[13px] lg:text-[14px] font-medium">{hasNote ? 'Изменить' : 'Заметка'}</span>
                          </button>
                        </div>

                        {hasNote && (
                          <div className="mt-5 pt-4 border-t border-gray-700/50">
                            <p className="text-[15px] leading-relaxed text-gray-300 whitespace-pre-wrap">{notes[noteKey]}</p>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- МОДАЛЬНОЕ ОКНО --- */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setIsNoteModalOpen(false)}>
          <div className="bg-card-bg w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-5 gap-4">
              <h3 className="font-bold text-lg text-white leading-tight">{currentNoteTitle}</h3>
              <button onClick={() => setIsNoteModalOpen(false)} className="text-gray-400 hover:text-white transition-colors shrink-0 bg-app-bg p-1.5 rounded-full"><X size={20} /></button>
            </div>
            
            <textarea
              className="w-full bg-app-bg text-white border border-gray-700/60 rounded-2xl p-4 min-h-[140px] focus:outline-none focus:border-accent-blue resize-none text-[15px] placeholder:text-gray-500 leading-relaxed"
              placeholder="Добавить заметку к этой паре (д/з, что принести)..."
              value={currentNoteText}
              onChange={e => setCurrentNoteText(e.target.value)}
              autoFocus
            />
            
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setIsNoteModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 rounded-xl transition-colors">Отмена</button>
              <button onClick={saveNote} className="px-6 py-2.5 text-sm font-bold bg-accent-blue text-black rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-accent-blue/20">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}