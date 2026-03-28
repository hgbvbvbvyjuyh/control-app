"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSameYear = exports.isSameMonth = exports.isSameWeek = exports.isSameDay = exports.getWeekNumber = void 0;
const getWeekNumber = (d) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};
exports.getWeekNumber = getWeekNumber;
const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
exports.isSameDay = isSameDay;
const isSameWeek = (d1, d2) => d1.getFullYear() === d2.getFullYear() &&
    (0, exports.getWeekNumber)(d1) === (0, exports.getWeekNumber)(d2);
exports.isSameWeek = isSameWeek;
const isSameMonth = (d1, d2) => d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth();
exports.isSameMonth = isSameMonth;
const isSameYear = (d1, d2) => d1.getFullYear() === d2.getFullYear();
exports.isSameYear = isSameYear;
//# sourceMappingURL=dateUtils.js.map