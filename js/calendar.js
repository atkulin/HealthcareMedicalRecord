/*
    Copyright (C) 2025 Atanas Kulin

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

const calendarDiv = document.getElementById('calendar');
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return weekNo;
}

function renderCalendar(month, year) {
    calendarDiv.innerHTML = '';
    const months = [
        { m: month, y: year },
        { m: (month + 1) % 12, y: month === 11 ? year + 1 : year }
    ];
    const today = new Date();
    const monthNames = [
        "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"
    ];
    const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

    const calWrapper = document.createElement('div');
    calWrapper.className = 'dual-calendar';

    months.forEach((obj, idx) => {
        const firstDay = new Date(obj.y, obj.m, 1);
        const lastDay = new Date(obj.y, obj.m + 1, 0);
        const startDay = (firstDay.getDay() + 6) % 7; // Montag = 0
        const daysInMonth = lastDay.getDate();

        const cal = document.createElement('div');
        cal.className = 'calendar';

        // Monatstitel
        const title = document.createElement('div');
        title.className = 'calendar-title';
        title.textContent = monthNames[obj.m] + ' ' + obj.y;
        cal.appendChild(title);

        // Wochentage
        const weekRow = document.createElement('div');
        weekRow.className = 'calendar-row calendar-header';
        weekRow.innerHTML = '<div class="calendar-cell weeknum-head">KW</div>' +
            weekDays.map(wd => `<div class="calendar-cell">${wd}</div>`).join('');
        cal.appendChild(weekRow);

        // Tage
        let date = 1;
        for (let row = 0; row < 6; row++) {
            const weekRow = document.createElement('div');
            weekRow.className = 'calendar-row';

            // Kalenderwoche
            let weekDate = new Date(obj.y, obj.m, date === 1 ? 1 : date);
            let weekNum = '';
            if (date <= daysInMonth) {
                weekNum = getWeekNumber(weekDate);
            }
            weekRow.innerHTML += `<div class="calendar-cell weeknum">${weekNum || ''}</div>`;

            for (let col = 0; col < 7; col++) {
                if ((row === 0 && col < startDay) || date > daysInMonth) {
                    weekRow.innerHTML += `<div class="calendar-cell empty"></div>`;
                } else {
                    const isToday = obj.m === today.getMonth() && obj.y === today.getFullYear() && date === today.getDate();
                    weekRow.innerHTML += `<div class="calendar-cell day${isToday ? ' today' : ''}" data-date="${obj.y}-${obj.m+1}-${date}">${date}</div>`;
                    date++;
                }
            }
            cal.appendChild(weekRow);
            if (date > daysInMonth) break;
        }
        calWrapper.appendChild(cal);
    });

    calendarDiv.appendChild(calWrapper);
}

document.getElementById('prevMonth').onclick = () => {
    if (currentMonth === 0) {
        currentMonth = 11;
        currentYear--;
    } else {
        currentMonth--;
    }
    renderCalendar(currentMonth, currentYear);
};
document.getElementById('nextMonth').onclick = () => {
    if (currentMonth === 11) {
        currentMonth = 0;
        currentYear++;
    } else {
        currentMonth++;
    }
    renderCalendar(currentMonth, currentYear);
};

renderCalendar(currentMonth, currentYear);