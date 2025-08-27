const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'data', 'db.json');

const sample = {
  menu: [
    { id: 'ITM-1', name: 'Rice Meal A', price: 75, stock: 20, category: 'Meals', isActive: true },
    { id: 'ITM-2', name: 'Choco Drink', price: 45, stock: 0, category: 'Beverages', isActive: true },
    { id: 'ITM-3', name: 'Oishi Pillows', price: 12, stock: 14, category: 'Snacks', isActive: true }
  ],
  reservations: [
    { id: 'RES-1', userId: null, student: 'Student', grade: 'N/A', section: 'N/A', when: '12:00 PM', note: '', items: [ { id: 'ITM-3', name: 'Oishi Pillows', price: 12, qty: 1 } ], total: 12, status: 'Claimed', createdAt: new Date().toISOString() }
  ],
  topups: [
    { id: 'top_1', userId: null, amount: 100, method: 'gcash', reference: 'REF123', status: 'Approved', createdAt: new Date().toISOString() }
  ],
  users: [
    { id: 'USR-1', name: 'Admin', email: 'admin@school.test', role: 'admin' },
    { id: 'USR-2', name: 'Student', email: 'student@school.test', role: 'user' }
  ],
  transactions: []
};

fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, JSON.stringify(sample, null, 2), 'utf8');
console.log('Dev seed written to', file);
