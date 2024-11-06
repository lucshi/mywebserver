
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(':memory:');

db.serialize(() => {
  db.run(`CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    contact TEXT,
    status TEXT,
    user_name TEXT,
    class TEXT,
    phone TEXT,
    image_url TEXT,
    visibility TEXT
  )`);
});

module.exports = {
  getAllBooks: () => {
    return new Promise((resolve, reject) => {
      db.all("SELECT id, title, contact, status FROM books", (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });
  },

  getBookById: (id) => {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM books WHERE id = ?", [id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
  },

  addBook: (title, contact, status, user_name, class_, phone, image_url, visibility) => {
    return new Promise((resolve, reject) => {
      db.run(`INSERT INTO books (title, contact, status, user_name, class, phone, image_url, visibility)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, contact, status, user_name, class_, phone, image_url, visibility],
        (err) => {
          if (err) reject(err);
          resolve();
        });
    });
  }
};
