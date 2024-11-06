
const express = require('express');
const app = express();
const path = require('path');
const db = require('./database');
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Home page - display book list
app.get('/', async (req, res) => {
  const books = await db.getAllBooks();
  res.render('index', { books });
});

// Book detail page
app.get('/book/:id', async (req, res) => {
  const book = await db.getBookById(req.params.id);
  if (!book) {
    return res.status(404).send("Book not found");
  }
  res.render('details', { book });
});

app.listen(port, () => {
  console.log(`Web server is running at http://localhost:${port}`);
});
