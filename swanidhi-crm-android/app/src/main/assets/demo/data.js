// Demo data for the offline CRM. Generated once from a fixed seed (so every phone sees the
// same people), dated relative to today, then kept in localStorage so edits persist.
(function () {
  var KEY = 'swanidhi_demo_db_v1';
  var DAY = 86400000;

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  var FIRST_M = ['Aarav', 'Rohit', 'Aman', 'Vikash', 'Saurabh', 'Ankit', 'Deepak', 'Rahul', 'Sachin', 'Mohd. Arif', 'Imran', 'Shivam', 'Abhishek', 'Pankaj', 'Nitin', 'Gaurav', 'Harsh', 'Kunal', 'Ravi', 'Sumit'];
  var FIRST_F = ['Priya', 'Neha', 'Pooja', 'Anjali', 'Kajal', 'Shalini', 'Nisha', 'Sana', 'Ayesha', 'Ritika', 'Komal', 'Khushi', 'Muskan', 'Sneha', 'Divya', 'Simran', 'Tanya', 'Jyoti', 'Preeti', 'Rani'];
  var LAST = ['Sharma', 'Verma', 'Yadav', 'Gupta', 'Singh', 'Mishra', 'Pandey', 'Tiwari', 'Khan', 'Ansari', 'Maurya', 'Chauhan', 'Srivastava', 'Kumar', 'Patel', 'Dubey', 'Rajput', 'Saxena', 'Jaiswal', 'Shukla'];
  var CITIES = ['Lucknow', 'Kanpur', 'Varanasi', 'Prayagraj', 'Gorakhpur', 'Ayodhya', 'Bareilly', 'Agra', 'Meerut', 'Patna', 'Sultanpur', 'Barabanki'];
  var SOURCES = ['website', 'walk_in', 'referral', 'whatsapp', 'phone', 'social_media', 'excel_import'];
  var MODES = ['upi', 'cash', 'neft', 'card', 'cheque'];

  function generate() {
    var r = rng(20262027);
    var pick = function (a) { return a[Math.floor(r() * a.length)]; };
    var int = function (a, b) { return a + Math.floor(r() * (b - a + 1)); };
    var now = Date.now();
    var today = new Date(); today.setHours(10, 0, 0, 0);
    var iso = function (t) { return new Date(t).toISOString(); };
    var phone = function () { return String(pick([6, 7, 8, 9])) + String(int(100000000, 999999999)); };
    var courses = window.SW_COURSES;

    var staff = [
      { id: 'u1', name: 'Demo Admin', email: 'demo.admin@swanidhi.test', role: 'admin', phone: '9876500001' },
      { id: 'u2', name: 'Priya Sharma', email: 'priya@swanidhi.test', role: 'lead', phone: '9876500002' },
      { id: 'u3', name: 'Rahul Verma', email: 'rahul@swanidhi.test', role: 'counselor', phone: '9876500003' },
      { id: 'u4', name: 'Neha Gupta', email: 'neha@swanidhi.test', role: 'counselor', phone: '9876500004' },
      { id: 'u5', name: 'Amit Yadav', email: 'amit@swanidhi.test', role: 'counselor', phone: '9876500005' },
      { id: 'u6', name: 'Sana Khan', email: 'sana@swanidhi.test', role: 'counselor', phone: '9876500006' },
      { id: 'u7', name: 'Vikas Mishra', email: 'vikas@swanidhi.test', role: 'backend', phone: '9876500007' },
      { id: 'u8', name: 'Kavita Pandey', email: 'kavita@swanidhi.test', role: 'backend', phone: '9876500008' },
      { id: 'u9', name: 'Ramesh Kumar', email: 'ramesh@swanidhi.test', role: 'housekeeping', phone: '9876500009' },
      { id: 'u10', name: 'Sunita Devi', email: 'sunita@swanidhi.test', role: 'housekeeping', phone: '9876500010' },
    ];
    var counsellors = staff.filter(function (s) { return s.role === 'lead' || s.role === 'counselor'; });

    var associates = [
      { id: 'a1', name: 'Shiv Shakti Education Point', owner: 'Manoj Tiwari', city: 'Gorakhpur', phone: '9450011111', commission: 8 },
      { id: 'a2', name: 'Career Guidance Centre', owner: 'Farhan Ali', city: 'Barabanki', phone: '9450022222', commission: 10 },
      { id: 'a3', name: 'Bright Future Consultancy', owner: 'Sunil Maurya', city: 'Sultanpur', phone: '9450033333', commission: 8 },
      { id: 'a4', name: 'Vidya Admission Help Desk', owner: 'Rekha Srivastava', city: 'Ayodhya', phone: '9450044444', commission: 7 },
      { id: 'a5', name: 'Gyan Deep Academy', owner: 'Ajay Chauhan', city: 'Bareilly', phone: '9450055555', commission: 9 },
    ];

    function person() {
      var female = r() < 0.55;
      return { name: pick(female ? FIRST_F : FIRST_M) + ' ' + pick(LAST), female: female };
    }

    // ---- Leads ----
    var STATUS_POOL = ['new', 'new', 'new', 'contacted', 'contacted', 'interested', 'interested', 'counselled',
      'document_received', 'converted', 'converted', 'converted', 'dnp', 'not_reachable', 'switch_off', 'not_interested', 'lost'];
    var leads = [], activities = [];
    for (var i = 0; i < 68; i++) {
      var p = person();
      var course = pick(courses);
      var created = now - int(0, 44) * DAY - int(0, 9) * 3600000;
      var status = i < 6 ? 'new' : pick(STATUS_POOL);
      if (i < 6) created = now - int(0, 6) * 3600000;
      var assoc = r() < 0.25 ? pick(associates).id : null;
      var c = pick(counsellors);
      var lead = {
        id: 'L' + (1001 + i), name: p.name, phone: phone(), city: pick(CITIES),
        email: p.name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') + int(10, 99) + '@gmail.com',
        course: course.name, dept: course.dept, status: status,
        source: assoc ? 'referral' : pick(SOURCES), associate: assoc,
        assigned: c.id, created: iso(created), updated: iso(created + int(1, 30) * 3600000),
        followup: ['new', 'contacted', 'interested', 'counselled', 'document_received', 'dnp'].indexOf(status) >= 0
          ? iso(today.getTime() + int(-2, 6) * DAY) : null,
        note: '',
      };
      leads.push(lead);
      activities.push({ id: 'A' + leads.length + 'a', lead: lead.id, type: 'created', text: 'Lead created from ' + lead.source.replace('_', ' '), by: 'u1', at: lead.created });
      if (status !== 'new') {
        activities.push({ id: 'A' + leads.length + 'b', lead: lead.id, type: 'call_made', text: pick(['Called — discussed course fee and hostel', 'Called — asked about eligibility', 'Call back requested in the evening', 'Parents want campus visit']), by: c.id, at: iso(created + 5 * 3600000) });
        activities.push({ id: 'A' + leads.length + 'c', lead: lead.id, type: 'status_changed', text: 'Status changed to ' + status.replace('_', ' '), by: c.id, at: lead.updated });
      }
    }

    // ---- Students ----
    var students = [], payments = [];
    var seq = 1, rec = 1;
    var DOCS = ['10th Marksheet', '12th Marksheet', 'Aadhaar Card', 'Transfer Certificate', 'Passport Photo', 'Migration Certificate'];
    function addStudent(name, ph, city, course, counsellor, enrolled, leadId, assoc) {
      var c = courses.filter(function (x) { return x.name === course; })[0] || pick(courses);
      var firstYear = Math.round(c.fee / Math.max(1, parseFloat(c.duration) || 1));
      var st = {
        id: 'S' + (100 + seq), enrollment: 'SGI-2026-' + String(seq).padStart(4, '0'),
        name: name, phone: ph, city: city, father: pick(FIRST_M) + ' ' + name.split(' ').slice(-1)[0],
        course: c.name, dept: c.dept, duration: c.duration, totalFee: c.fee, session: '2026-27',
        counsellor: counsellor, lead: leadId || null, associate: assoc || null,
        enrolled: iso(enrolled), status: 'active',
        docs: DOCS.map(function (d, k) { return { name: d, done: k < 2 || r() < 0.6 }; }),
      };
      seq++;
      students.push(st);
      var paid = 0, n = int(1, 3), target = Math.min(c.fee, firstYear) * (0.4 + r() * 0.6);
      for (var k = 0; k < n; k++) {
        var amt = Math.round((target / n) / 500) * 500;
        if (amt <= 0) continue;
        paid += amt;
        payments.push({
          id: 'P' + (5000 + rec), student: st.id, amount: amt, mode: pick(MODES),
          date: iso(enrolled + k * int(5, 15) * DAY), receipt: 'SGI/RCP/' + String(rec).padStart(5, '0'), by: pick(['u7', 'u8']),
        });
        rec++;
      }
    }
    leads.filter(function (l) { return l.status === 'converted'; }).forEach(function (l) {
      addStudent(l.name, l.phone, l.city, l.course, l.assigned, new Date(l.updated).getTime(), l.id, l.associate);
    });
    while (students.length < 36) {
      var pp = person();
      addStudent(pp.name, phone(), pick(CITIES), pick(courses).name, pick(counsellors).id,
        now - int(20, 120) * DAY, null, r() < 0.2 ? pick(associates).id : null);
    }
    payments = payments.filter(function (p) { return new Date(p.date).getTime() <= now; });

    // ---- HRMS ----
    var DESIG = { admin: 'Administrator', lead: 'Admissions Head', counselor: 'Admission Counsellor', backend: 'Accounts Executive', housekeeping: 'Office Assistant' };
    var BASIC = { admin: 45000, lead: 32000, counselor: 22000, backend: 24000, housekeeping: 12000 };
    var employees = staff.map(function (s, k) {
      return { id: 'E' + (k + 1), user: s.id, code: 'SGI-EMP-' + String(k + 1).padStart(3, '0'), designation: DESIG[s.role],
        department: s.role === 'housekeeping' ? 'Administration' : s.role === 'backend' ? 'Accounts' : 'Admissions',
        joined: iso(now - int(90, 900) * DAY), basic: BASIC[s.role], hra: Math.round(BASIC[s.role] * 0.2), allowances: 1500 };
    });
    var attendance = {};
    var monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    staff.forEach(function (s) {
      for (var d = new Date(monthStart); d < today; d = new Date(d.getTime() + DAY)) {
        var key = s.id + '|' + d.toISOString().slice(0, 10);
        if (d.getDay() === 0) { attendance[key] = { status: 'holiday' }; continue; }
        var x = r();
        var status = x < 0.78 ? 'present' : x < 0.88 ? 'late' : x < 0.94 ? 'leave' : x < 0.97 ? 'half_day' : 'absent';
        attendance[key] = status === 'leave' || status === 'absent' ? { status: status } : {
          status: status, in: (status === 'late' ? '10:' + int(10, 45) : '09:' + String(int(25, 58))),
          out: (status === 'half_day' ? '14:' + int(10, 40) : '18:' + String(int(0, 40)).padStart(2, '0')),
        };
      }
    });

    // ---- Finance ----
    var EXP = [['rent', 'Campus office rent', 85000], ['utilities', 'Electricity bill', 14200], ['marketing', 'Facebook & Instagram ads', 25000],
      ['marketing', 'Newspaper advertisement — Dainik Jagran', 18000], ['travel', 'Counselling camp — Sultanpur', 6400], ['utilities', 'Internet & phone', 4800],
      ['vendor', 'Prospectus printing', 22000], ['misc', 'Office stationery', 3600], ['travel', 'Seminar travel — Ayodhya', 5200], ['marketing', 'Hoardings — Barabanki', 30000],
      ['vendor', 'CCTV maintenance', 7500], ['misc', 'Tea & refreshments', 2800], ['utilities', 'Water supply', 1800], ['vendor', 'Furniture repair', 9600]];
    var expenses = EXP.map(function (e, k) {
      return { id: 'X' + (k + 1), category: e[0], description: e[1], amount: e[2], date: iso(now - int(0, 40) * DAY),
        mode: pick(['upi', 'neft', 'cash']), status: k < 2 ? 'pending' : 'approved', by: pick(['u7', 'u8', 'u1']) };
    });

    // ---- Targets / tasks / notifications ----
    var targets = counsellors.map(function (c) { return { user: c.id, admissions: int(3, 6), revenue: int(3, 6) * 50000 }; });
    var TASKS = ['Call back all DNP leads from last week', 'Verify documents of new B.Sc. Nursing admissions', 'Prepare fee defaulter list for October',
      'Update hostel availability on website', 'Plan counselling camp in Gorakhpur', 'Send admit cards to GNM 1st year', 'Collect pending cheques from associates',
      'Upload September salary slips', 'Follow up with Bright Future Consultancy', 'Arrange campus visit for Sultanpur students'];
    var tasks = TASKS.map(function (t, k) {
      return { id: 'T' + (k + 1), title: t, assigned: pick(staff.slice(0, 8)).id, due: iso(today.getTime() + int(-2, 7) * DAY),
        priority: pick(['high', 'medium', 'low']), done: k > 6 };
    });
    var notifications = [
      { id: 'N1', title: 'New website enquiry', body: leads[0].name + ' enquired about ' + leads[0].course, at: leads[0].created, read: false },
      { id: 'N2', title: 'Fee received', body: '₹' + payments[payments.length - 1].amount.toLocaleString('en-IN') + ' received via ' + payments[payments.length - 1].mode.toUpperCase(), at: iso(now - 3 * 3600000), read: false },
      { id: 'N3', title: 'Follow-ups due today', body: 'You have follow-ups scheduled for today', at: iso(now - 6 * 3600000), read: false },
      { id: 'N4', title: 'Target update', body: 'Admissions team reached 60% of the monthly target', at: iso(now - DAY), read: true },
    ];

    return {
      version: 1, generatedAt: iso(now), staff: staff, associates: associates, leads: leads, activities: activities,
      students: students, payments: payments, employees: employees, attendance: attendance, expenses: expenses,
      targets: targets, tasks: tasks, notifications: notifications, punches: {},
    };
  }

  var cache = null;
  window.DB = {
    get: function () {
      if (cache) return cache;
      try { cache = JSON.parse(localStorage.getItem(KEY)); } catch (e) { cache = null; }
      if (!cache || cache.version !== 1) { cache = generate(); this.save(); }
      return cache;
    },
    save: function () { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {} },
    reset: function () { cache = generate(); this.save(); },
  };
})();
