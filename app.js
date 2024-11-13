const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcryptjs'); // 引入 bcryptjs 用于密码加密

const app = express();
const db = new sqlite3.Database('./database/second_hand_books.db');

// 创建表格（如果不存在）
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        condition TEXT,
        school TEXT,
        location TEXT,
        grade TEXT,
        class_info TEXT,
        contact_name TEXT,
        contact TEXT,
        message TEXT,
        image TEXT,
        status TEXT,
        user_id INTEGER,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
});

// 设置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your_secret_key', // 请更改为您的密钥
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // 如果在开发环境中使用 HTTP
}));

// 文件上传配置
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// 确保用户已登录
function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');  // 如果未登录，重定向到登录页面
}

// 登录页面
app.get('/login', (req, res) => {
    res.render('login', { user: req.session.user || null });
});
// 登录处理
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // 查询数据库中的用户
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user) {
            return res.status(400).send("用户名或密码错误");
        }

        // 使用 bcrypt.compare 比较加密后的密码
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).send("密码验证错误");
            }

            if (!isMatch) {
                return res.status(400).send("用户名或密码错误");
            }

            // 密码匹配，保存用户信息到 session
            req.session.user = user;
            res.redirect('/'); // 登录成功后重定向到首页
        });
    });
});

// 查看物品详情页面
app.get('/item/:id', (req, res) => {
    const itemId = req.params.id;  // 获取物品的 ID
    db.get("SELECT * FROM books WHERE id = ?", [itemId], (err, item) => {
        if (err || !item) {
            console.error("数据库查询错误:", err);
            return res.status(404).send("物品未找到");
        }
        // 将物品详细信息传递给视图
        res.render('item_detail', { item: item, user: req.session.user });
    });
});


// 我的物品页面
app.get('/my-books', ensureAuthenticated, (req, res) => {
    const userId = req.session.user.id;  // 获取登录用户的 ID
    db.all("SELECT * FROM books WHERE user_id = ?", [userId], (err, books) => {
        if (err) {
            console.error("数据库查询错误:", err);
            return res.status(500).send("数据库错误");
        }
        // 确保传递了 items 变量给视图
        res.render('my_books', { items: books, user: req.session.user });
    });
});


// 首页路由
app.get('/', (req, res) => {
    db.all("SELECT * FROM books ORDER BY id DESC", [], (err, items) => {
        if (err) {
            console.error("数据库查询错误:", err);
            return res.status(500).send("数据库错误");
        }
        res.render('index', { items: items, user: req.session.user });
    });
});

// 转让物品页面
app.get('/transfer', async (req, res) => {
    try {
        // 从数据库中查询唯一的学校和地点名称
        db.all("SELECT DISTINCT school FROM books WHERE school IS NOT NULL", [], (err, schools) => {
            if (err) {
                console.error("获取学校列表失败:", err);
                res.render('transfer_book', { schools: [], locations: [], user: req.session.user });
            } else {
                db.all("SELECT DISTINCT location FROM books WHERE location IS NOT NULL", [], (err, locations) => {
                    if (err) {
                        console.error("获取地点列表失败:", err);
                        res.render('transfer_book', { schools: schools, locations: [], user: req.session.user });
                    } else {
                        // 成功获取学校和地点数据并传递给视图
                        res.render('transfer_book', { schools: schools, locations: locations, user: req.session.user });
                    }
                });
            }
        });
    } catch (error) {
        console.error("数据库操作失败:", error);
        res.render('transfer_book', { schools: [], locations: [], user: req.session.user });
    }
});


// 联系对方页面
app.get('/contact/:id', ensureAuthenticated, (req, res) => {
    const itemId = req.params.id;  // 获取物品的 ID
    db.get("SELECT * FROM books WHERE id = ?", [itemId], (err, item) => {
        if (err || !item) {
            console.error("数据库查询错误:", err);
            return res.status(404).send("物品未找到");
        }
        // 将物品详细信息传递给视图
        res.render('contact', { item: item, user: req.session.user });
    });
});

// 更新物品状态为“已预订”
app.post('/contact/:id', (req, res) => {
    const itemId = req.params.id;
    db.run("UPDATE books SET status = '已预订' WHERE id = ?", [itemId], function(err) {
        if (err) {
            console.error("数据库更新错误:", err);
            return res.status(500).send("数据库错误");
        }
        res.redirect(`/item/${itemId}`); // 重定向回详情页面
    });
});

// 编辑物品页面
app.get('/edit/:id', ensureAuthenticated, (req, res) => {
    const bookId = req.params.id;  // 获取 URL 中的物品 ID
    db.get("SELECT * FROM books WHERE id = ?", [bookId], (err, book) => {
        if (err || !book) {
            console.error("物品未找到:", err);
            return res.status(404).send("物品未找到");
        }
        // 渲染编辑页面，并传递物品信息
        res.render('edit_book', { book: book, user: req.session.user });
    });
});

// 更新物品信息
app.post('/update/:id', ensureAuthenticated, upload.single('image'), (req, res) => {
    const bookId = req.params.id;
    let { name, condition, school, location, grade, class_info, contact_name, contact, message, new_school, new_location } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;

    // 使用用户手动输入的新学校和地点（如果有）
    if (school === 'add-new-school' && new_school.trim()) {
        school = new_school.trim(); // 将学校设为用户输入的值
    }
    if (location === 'add-new-location' && new_location.trim()) {
        location = new_location.trim(); // 将地点设为用户输入的值
    }

    // 构建 SQL 更新查询
    const query = image 
        ? `UPDATE books SET name = ?, condition = ?, school = ?, location = ?, grade = ?, class_info = ?, contact_name = ?, contact = ?, message = ?, image = ? WHERE id = ?`
        : `UPDATE books SET name = ?, condition = ?, school = ?, location = ?, grade = ?, class_info = ?, contact_name = ?, contact = ?, message = ? WHERE id = ?`;

    const params = image
        ? [name, condition, school, location, grade, class_info, contact_name, contact, message, image, bookId]
        : [name, condition, school, location, grade, class_info, contact_name, contact, message, bookId];

    // 执行更新
    db.run(query, params, function(err) {
        if (err) {
            console.error("数据库更新错误:", err);
            return res.status(500).send("数据库错误");
        }
        res.redirect('/my-books'); // 更新成功后返回到“我的物品”页面
    });
});

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


app.post('/transfer', ensureAuthenticated, upload.single('image'), (req, res) => {
    let { name, condition, school, location, grade, class_info, contact, contact_name, message, new_school, new_location } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    const userId = req.session.user.id;

    // 使用用户手动输入的新学校和地点（如果有）
    if (school === 'add-new-school' && new_school.trim()) {
        school = new_school.trim(); // 使用用户输入的学校名称
    }
    if (location === 'add-new-location' && new_location.trim()) {
        location = new_location.trim(); // 使用用户输入的地点名称
    }

    db.run(`INSERT INTO books (name, condition, school, location, grade, class_info, contact, contact_name, message, image, user_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '可用')`, 
        [name, condition, school, location, grade, class_info, contact, contact_name, message, image, userId], 
        function(err) {
            if (err) {
                console.error("数据库插入错误:", err);
                return res.status(500).send("数据库错误");
            }
            res.redirect('/');  // 转让物品后重定向到首页
        });
});

// 删除物品
app.post('/delete/:id', ensureAuthenticated, (req, res) => {
    const bookId = req.params.id;  // 获取物品的 ID

    db.run("DELETE FROM books WHERE id = ?", [bookId], function(err) {
        if (err) {
            console.error("数据库删除错误:", err);
            return res.status(500).send("数据库错误");
        }
        res.redirect('/my-books'); // 删除成功后重定向到“我的物品”页面
    });
});

// 下架物品
app.post('/unshelve/:id', ensureAuthenticated, (req, res) => {
    const bookId = req.params.id;
    db.run("UPDATE books SET status = '已预订' WHERE id = ?", [bookId], function(err) {
        if (err) {
            console.error("数据库更新错误:", err);
            return res.status(500).send("数据库错误");
        }
        res.redirect('/my-books'); // 更新后重定向到“我的物品”页面
    });
});

// 上架物品
app.post('/shelve/:id', ensureAuthenticated, (req, res) => {
    const bookId = req.params.id;
    db.run("UPDATE books SET status = '可用' WHERE id = ?", [bookId], function(err) {
        if (err) {
            console.error("数据库更新错误:", err);
            return res.status(500).send("数据库错误");
        }
        res.redirect('/my-books'); // 更新后重定向到“我的物品”页面
    });
});


// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器正在运行在端口 ${PORT}`);
});
