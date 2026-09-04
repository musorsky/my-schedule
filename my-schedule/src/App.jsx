import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Sun, CalendarDays, Map, User, ChevronDown } from 'lucide-react';
import { startOfWeek, addDays, differenceInCalendarWeeks } from 'date-fns';
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

export default function App() {
  const [groupsData, setGroupsData] = useState(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Настройка тумблера "Показывать даты" (с сохранением в память)
  const [showDates, setShowDates] = useState(() => {
    const saved = localStorage.getItem('showDates');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 7 : d; 
  });

  const getActualEvenWeek = () => {
    const today = new Date();
    const isSpring = today.getMonth() < 7;
    const currentAcademicYear = isSpring ? today.getFullYear() - 1 : today.getFullYear();
    const septFirst = new Date(currentAcademicYear, 8, 1);
    const weekDiff = differenceInCalendarWeeks(today, septFirst, { weekStartsOn: 1 });
    return weekDiff % 2 !== 0;
  };

  const [actualIsEvenWeek] = useState(getActualEvenWeek());
  const [isEvenWeek, setIsEvenWeek] = useState(actualIsEvenWeek);

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
  };

  if (!groupsData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-app-bg px-6">
        <div className="w-20 h-20 bg-card-bg rounded-3xl flex items-center justify-center mb-6 shadow-lg">
          <CalendarDays className="text-accent-blue w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Расписание</h1>
        <p className="text-gray-400 text-center mb-8 text-sm">Загрузите Excel-файл со вкладками групп, чтобы начать.</p>
        
        <label className="relative cursor-pointer bg-accent-blue text-black font-semibold py-4 px-8 rounded-2xl w-full text-center transition active:scale-95">
          {loading ? "Обработка..." : "Выбрать Excel-файл"}
          <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} />
        </label>
      </div>
    );
  }

  // --- УМНЫЙ РАСЧЕТ ДАТ ---
  const today = new Date();
  
  // Если мы смотрим "другую" неделю (не ту, которая сейчас в реальности), сдвигаем даты на 7 дней вперед
  let baseDateForCalendar = today;
  if (isEvenWeek !== actualIsEvenWeek) {
    baseDateForCalendar = addDays(today, 7);
  }
  
  const startOfDisplayedWeek = startOfWeek(baseDateForCalendar, { weekStartsOn: 1 });
  const dayNamesShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const fullDayNames = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const monthsRu = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

  // Генерируем даты для отображаемой недели
  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const dateObj = addDays(startOfDisplayedWeek, i);
    return {
      id: i + 1,
      name: dayNamesShort[i],
      dateNum: dateObj.getDate(),
      fullDateObj: dateObj
    };
  });

  // Узнаем, какой день (1-7) является реальным сегодняшним
  const actualTodayId = today.getDay() === 0 ? 7 : today.getDay();

  const currentGroup = groupsData[selectedGroupIndex];
  const currentSchedule = currentGroup.schedule[isEvenWeek ? 'even' : 'odd'][selectedDay] || [];
  
  // Динамический заголовок в зависимости от тумблера
  const selectedDateObj = weekDates[selectedDay - 1].fullDateObj;
  const formattedHeaderDate = showDates 
    ? `${fullDayNames[selectedDay - 1]}, ${selectedDateObj.getDate()} ${monthsRu[selectedDateObj.getMonth()]}`
    : fullDayNames[selectedDay - 1];

  return (
    <div className="min-h-screen bg-app-bg pb-8 font-sans selection:bg-accent-blue selection:text-black">
      {/* Header */}
      <header className="px-5 pt-12 pb-4 flex justify-between items-start">
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
        
        {/* Правый блок: Тумблер дат + Кнопка сброса */}
        <div className="flex gap-4 items-center mt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs font-medium text-gray-400">Даты</span>
            <div className="relative inline-flex items-center">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={showDates} 
                onChange={() => {
                  setShowDates(!showDates);
                  localStorage.setItem('showDates', JSON.stringify(!showDates));
                }} 
              />
              <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent-blue"></div>
            </div>
          </label>

          <button className="w-10 h-10 rounded-full bg-card-bg flex items-center justify-center shrink-0" onClick={handleClear} title="Сбросить расписание">
            <MoreHorizontal size={20} className="text-gray-300" />
          </button>
        </div>
      </header>

      {/* Переключатель недель */}
      <div className="px-5 mb-6 mt-2">
        <div className="bg-card-bg rounded-2xl flex p-1 relative">
          <div 
            className={`absolute top-1 bottom-1 w-[50%] bg-accent-blue rounded-xl transition-all duration-300 ${isEvenWeek ? 'left-[calc(50%-4px)]' : 'left-1'}`} 
          />
          <button 
            className={`flex-1 py-2.5 text-sm font-medium z-10 transition-colors flex justify-center items-center gap-1.5 ${!isEvenWeek ? 'text-black' : 'text-gray-400'}`}
            onClick={() => setIsEvenWeek(false)}
          >
            Нечетная неделя
            {!actualIsEvenWeek && (
              <div className={`w-1.5 h-1.5 rounded-full ${!isEvenWeek ? 'bg-black' : 'bg-accent-blue'}`} />
            )}
          </button>
          <button 
            className={`flex-1 py-2.5 text-sm font-medium z-10 transition-colors flex justify-center items-center gap-1.5 ${isEvenWeek ? 'text-black' : 'text-gray-400'}`}
            onClick={() => setIsEvenWeek(true)}
          >
            Четная неделя
            {actualIsEvenWeek && (
              <div className={`w-1.5 h-1.5 rounded-full ${isEvenWeek ? 'bg-black' : 'bg-accent-blue'}`} />
            )}
          </button>
        </div>
      </div>

      {/* Горизонтальный скролл дней недели */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-2 no-scrollbar snap-x">
        {weekDates.map((day) => {
          const isSelected = selectedDay === day.id;
          const daySchedule = currentGroup.schedule[isEvenWeek ? 'even' : 'odd'][day.id] || [];
          
          // Проверяем, является ли эта карточка РЕАЛЬНЫМ сегодняшним днем (совпадает и день недели, и четность недели)
          const isRealToday = (day.id === actualTodayId) && (isEvenWeek === actualIsEvenWeek);

          const isDayRemote = daySchedule.some(isRemoteLesson);
          
          let btnClass = 'bg-card-bg text-gray-300 border border-transparent'; // Базовые стили
          let dotClass = 'bg-gray-500';
          
          // Если день РЕАЛЬНО сегодня, даем ему синюю обводку (даже если он не выбран)
          if (isRealToday && !isSelected) {
            btnClass = 'bg-card-bg text-accent-blue border border-accent-blue shadow-[0_0_10px_rgba(122,159,255,0.15)]';
          }

          // Если день выбран, заливаем его акцентным цветом
          if (isSelected) {
            btnClass = isDayRemote 
              ? 'bg-orange-400 text-black shadow-lg shadow-orange-400/20 border border-transparent' 
              : 'bg-accent-blue text-black shadow-lg shadow-accent-blue/20 border border-transparent';
            dotClass = 'bg-black/50';
          }

          const dots = Array.from({ length: Math.min(daySchedule.length, 5) });

          return (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`snap-center shrink-0 w-[60px] h-[84px] rounded-2xl flex flex-col items-center justify-center transition-all ${btnClass}`}
            >
              <span className={`text-xs font-medium ${showDates ? 'mb-0.5' : 'mb-1'}`}>{day.name}</span>
              
              {/* Показываем число только если включен тумблер */}
              {showDates && <span className="text-xl font-bold">{day.dateNum}</span>}
              
              <div className="flex gap-[3px] mt-1.5 h-1">
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

      {/* Заголовок текущего дня */}
      <div className="px-5 mt-6 mb-4">
        <h2 className="text-xl font-bold">{formattedHeaderDate}</h2>
        <p className="text-sm text-gray-400 mt-1">
          {currentSchedule.length > 0 ? `${currentSchedule.length} пар(ы)` : 'Пар нет'}
        </p>
      </div>

      {/* Список пар */}
      <div className="px-5 flex flex-col gap-3">
        {currentSchedule.length === 0 ? (
          <div className="bg-card-bg rounded-3xl p-6 flex items-center gap-4 mt-2">
            <div className="w-12 h-12 rounded-full bg-card-bg-light flex items-center justify-center shrink-0">
              <Sun className="text-gray-400" size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Сегодня без пар</h3>
              <p className="text-sm text-gray-400 mt-0.5">На выбранный день пар нет</p>
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
            
            const cardClasses = isRemote 
              ? 'bg-orange-500/10 border border-orange-500/20' 
              : 'bg-card-bg border border-transparent';
            const timeBadgeClasses = isRemote 
              ? 'bg-orange-500/20 text-orange-400' 
              : 'bg-card-bg-light text-accent-blue';

            return (
              <React.Fragment key={idx}>
                {breakMin > 0 && (
                  <div className="flex items-center justify-center my-1 opacity-80">
                    <div className="h-[1px] flex-1 bg-gray-800"></div>
                    <span className="text-xs text-gray-500 mx-3 font-medium tracking-wide">
                      Перерыв {breakMin} минут
                    </span>
                    <div className="h-[1px] flex-1 bg-gray-800"></div>
                  </div>
                )}

                <div className={`${cardClasses} rounded-3xl p-5 flex flex-col relative overflow-hidden transition-colors`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${timeBadgeClasses}`}>
                      {lesson.time}
                    </span>
                    {lesson.type && (
                      <span className="text-xs font-medium text-gray-400 border border-gray-700 px-2 py-1 rounded-md">
                        {lesson.type}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-[17px] leading-tight mb-2 pr-4">{lesson.subject}</h3>
                  
                  <div className="flex flex-col gap-1.5 mt-2">
                    {lesson.teacher && (
                      <p className="text-sm text-gray-400 flex items-center gap-2">
                        <User size={14} /> {lesson.teacher}
                      </p>
                    )}
                    {lesson.room && (
                      <p className="text-sm text-gray-400 flex items-center gap-2">
                        <Map size={14} /> {lesson.room}
                      </p>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}