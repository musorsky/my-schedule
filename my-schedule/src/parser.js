import * as XLSX from 'xlsx';

export async function parseSchedule(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const allGroups = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          let groupName = sheetName.toUpperCase(); 
          const schedule = {
            odd: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
            even: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
          };

          const dayMap = { 'ПН': 1, 'ВТ': 2, 'СР': 3, 'ЧТ': 4, 'ПТ': 5, 'СБ': 6 };
          let currentDay = null;
          let startRow = 0;

          // 1. Ищем строку с заголовками
          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            
            const groupCell = row.find(cell => typeof cell === 'string' && cell.includes('ГРУППА'));
            if (groupCell) {
              groupName = groupCell.replace('ГРУППА', '').trim();
            }
            
            if (row.includes('День недели')) {
              startRow = i + 1;
              break;
            }
          }

          if (startRow === 0) continue;

          // Вспомогательная функция (теперь с защитой от мусора)
          const addLesson = (targetArray, lesson) => {
            // Если нет названия предмета — игнорируем
            if (!lesson.subject || String(lesson.subject).trim() === '') return;
            
            // ЖЕСТКАЯ ПРОВЕРКА: Если время не содержит двоеточие (например, там ФИО), это мусор с нижних строк
            if (!lesson.time || !String(lesson.time).includes(':')) return;
            
            const last = targetArray[targetArray.length - 1];
            
            if (last && last.num === lesson.num && last.subject === lesson.subject) {
              const start = String(last.time).split('-')[0];
              const end = String(lesson.time).split('-')[1] || String(last.time).split('-')[1];
              last.time = `${start}-${end}`;
            } else {
              targetArray.push(lesson);
            }
          };

          // 2. Парсим строки расписания
          for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || row.length === 0) continue;

            // ЖЕСТКАЯ ОСТАНОВКА: Если дошли до подписей начальства, заканчиваем парсить эту страницу
            const rowStr = row.join(' ').toLowerCase();
            if (rowStr.includes('директор института') || rowStr.includes('учебно-организационного')) {
              break;
            }

            const dayString = row[1] ? String(row[1]).trim() : '';
            if (dayMap[dayString]) {
              currentDay = dayMap[dayString];
            }
            if (!currentDay) continue;

            // Нечетная неделя
            addLesson(schedule.odd[currentDay], {
              num: row[2],
              time: row[3] || '',
              room: row[4] || '',
              type: row[5] || '',
              teacher: row[6] || '',
              subject: row[7] || ''
            });

            // Четная неделя
            addLesson(schedule.even[currentDay], {
              num: row[13],
              time: row[12] || '',
              room: row[11] || '',
              type: row[10] || '',
              teacher: row[9] || '',
              subject: row[8] || ''
            });
          }
          
          allGroups.push({ groupName, schedule });
        }

        resolve(allGroups);
      } catch (err) {
        reject(err);
      }
    };
    
    reader.readAsArrayBuffer(file);
  });
}