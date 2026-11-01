/*
 * All Hebrew text shown to users. Change wording here; no logic depends on it.
 * {placeholders} are filled in by format().
 *
 * Loaded as a plain <script> in the browser (exposed as CQ.STRINGS) and via require() in tests.
 */
(function (root) {
  const STRINGS = {
    fields: {
      area: 'שטח (מ״ר)',
      thicknessCm: 'עובי (ס״מ)',
      workers: 'מספר עובדים',
      pricePerM3: 'מחיר בטון למ״ק',
      wastePercent: 'פחת (%)',
      vatPercent: 'מע״מ (%)',
      workerDayRate: 'עלות עובד ליום',
      m3PerWorkerDay: 'מ״ק לעובד ליום',
      minWorkers: 'מינימום עובדים',
      clientName: 'שם הלקוח',
      date: 'תאריך',
      name: 'שם השטח',
      length: 'אורך (מ׳)',
      width: 'רוחב (מ׳)',
    },

    placeholders: {
      name: 'לדוגמה: סלון, קומה 1',
      clientName: 'שם מלא או שם החברה',
    },

    units: {
      m3: 'מ״ק',
    },

    errors: {
      required: 'נא למלא {field}',
      notNumber: '{field} חייב להיות מספר (לדוגמה 12.5)',
      notPositive: '{field} חייב להיות גדול מ-0',
      notInteger: '{field} חייב להיות מספר שלם',
      belowMinWorkers: 'מספר העובדים המינימלי הוא {min}',
      invalidDate: 'נא לבחור תאריך תקין',
      noAreas: 'יש להוסיף לפחות שטח אחד להצעה',
    },

    warnings: {
      unusuallyHigh: '{field}: הערך {value} גבוה מהרגיל. כדאי לוודא שאין טעות הקלדה',
    },

    app: {
      title: 'מחשבון הצעת מחיר',
    },

    settings: {
      title: 'הגדרות מחירים',
      summary: 'בטון {price} למ״ק · עובד {rate} ליום',
      save: 'שמירת הגדרות',
      reset: 'איפוס לברירת מחדל',
      saved: 'ההגדרות נשמרו',
      savedNotPersisted: 'ההגדרות יחולו עד סגירת הדף (לא ניתן לשמור במכשיר זה)',
      resetConfirm: 'להחזיר את כל ההגדרות לברירת המחדל?',
      resetDone: 'ההגדרות הוחזרו לברירת המחדל',
      fixErrors: 'יש לתקן את השדות המסומנים באדום',
    },

    quote: {
      clientTitle: 'פרטי ההצעה',
      areasTitle: 'שטחים',
      addArea: '+ הוספת שטח',
      removeArea: 'הסרה',
      removeAreaLabel: 'הסרת {row}',
      lengthWidthToggle: 'חישוב לפי אורך × רוחב',
      rowVolume: 'נפח: {volume} מ״ק',
      crewTitle: 'צוות עבודה',
      crewHint: '{workers} עובדים × {days} ({perDay} מ״ק לעובד ביום)',
      totalsTitle: 'סיכום',
      incomplete: 'הסיכום יוצג כשכל השדות תקינים',
      totalBar: 'סה״כ כולל מע״מ',
    },

    // Lines of the price summary, shared by the screen and the PDF.
    summary: {
      netVolume: 'נפח בטון נטו',
      orderedVolume: 'נפח להזמנה (כולל {waste}% פחת)',
      concrete: 'בטון',
      concreteDetail: '{volume} מ״ק × {price}',
      labor: 'עבודה',
      laborDetail: '{workers} עובדים × {days} × {rate}',
      subtotal: 'סה״כ לפני מע״מ',
      vat: 'מע״מ ({vat}%)',
      total: 'סה״כ כולל מע״מ',
      oneDay: 'יום אחד',
      days: '{n} ימים',
    },

    // The client-facing quote (PDF). {placeholders} filled from CONFIG and the quote.
    print: {
      button: 'הפקת הצעת מחיר (PDF)',
      buttonHint: 'בחלון שייפתח בוחרים "שמירה כ-PDF" או שיתוף',
      fixFirst: 'לא ניתן להפיק הצעה: יש לתקן את השדות המסומנים באדום',
      docTitle: 'הצעת מחיר',
      fileName: 'הצעת מחיר - {client} - {date}',
      date: 'תאריך',
      client: 'לכבוד',
      areasTitle: 'פירוט שטחים',
      columns: {
        index: '#',
        name: 'שטח',
        area: 'שטח (מ״ר)',
        thicknessCm: 'עובי (ס״מ)',
        volume: 'נפח (מ״ק)',
      },
      totalVolume: 'סה״כ נפח נטו',
      priceTitle: 'פירוט מחיר',
      notesTitle: 'הערות',
      notes: [
        'המחירים בשקלים חדשים.',
        'נפח הבטון להזמנה כולל {waste}% פחת.',
        'ימי עבודה מחושבים לפי יום עבודה מלא.',
        'ההצעה בתוקף ל-{validityDays} ימים מתאריך ההצעה.',
      ],
      closing: 'בברכה,',
    },

    // Row label used when listing errors outside the row, e.g. "שטח 2 – עובי (ס״מ) חייב…"
    areaRow: 'שטח {n}',
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = STRINGS;
  else root.CQ = Object.assign(root.CQ || {}, { STRINGS });
})(this);
