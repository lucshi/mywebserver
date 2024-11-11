const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');


const app = express();
const db = new sqlite3.Database('./database/second_hand_books.db');

// 创建表格（如果不存在）
db.serialize(() => {
    // 用户表
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    // 书籍表
    db.run(`CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        condition TEXT,
        class_info TEXT,
        contact TEXT,
        contact_name TEXT,
        message TEXT,
        image TEXT,
        user_id INTEGER,
        status TEXT DEFAULT '可用',
        FOREIGN KEY (user_id) REFERENCES users(id)
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

// 首页路由，查询物品数据并渲染到首页
app.get('/', (req, res) => {
    db.all("SELECT * FROM books ORDER BY id DESC", [], (err, items) => {
        if (err) {
            console.error("数据库查询错误:", err);
            return res.status(500).send("数据库错误");
        }
        // 将 items 数据和 user 变量传递到视图
        res.render('index', { items: items, user: req.session.user });
    });
});

// 示例代码：插入一条样本数据
app.get('/add-sample-data', (req, res) => {
    const sampleItem = {
        category: '课本',
        name: '数学课本',
        condition: '9成新',
        grade: '高一',
        class_info: '1班',
        contact: '1234567890',
        contact_name: '李老师',
        message: '转让数学课本',
        image: '/uploads/sample.jpg',
        user_id: 1, // 假设用户ID为1
        status: '可用'
    };

    db.run(`INSERT INTO books (category, name, condition, grade, class_info, contact, contact_name, message, image, user_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [sampleItem.category, sampleItem.name, sampleItem.condition, sampleItem.grade, sampleItem.class_info,
        sampleItem.contact, sampleItem.contact_name, sampleItem.message, sampleItem.image, sampleItem.user_id, sampleItem.status],
        function(err) {
            if (err) {
                console.error("插入数据失败:", err);
                return res.status(500).send("数据插入错误");
            }
            res.send('样本数据插入成功');
        });
});

// 显示修改书本信息的页面
app.get('/edit/:id', (req, res) => {
    const bookId = req.params.id;
    db.get("SELECT * FROM books WHERE id = ?", [bookId], (err, book) => {
        if (err || !book) {
            return res.status(404).send("书本未找到");
        }
        res.render('edit_book', { book: book, user: req.session.user });
    });
});

// 更新书本信息
app.post('/update/:id', upload.single('image'), (req, res) => {
    const bookId = req.params.id;
    const { name, condition, grade, class_info, contact, contact_name, message } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;

    db.run(`UPDATE books SET 
            name = ?, 
            condition = ?, 
            grade = ?, 
            class_info = ?, 
            contact = ?, 
            contact_name = ?, 
            message = ?, 
            image = ? 
            WHERE id = ?`,
        [name, condition, grade, class_info, contact, contact_name, message, image, bookId],
        function(err) {
            if (err) {
                console.error("数据库更新错误:", err);
                return res.status(500).send("数据库错误");
            }
            res.redirect('/my-books');
        });
});

app.get('/item/:id', (req, res) => {
    const itemId = req.params.id;
    db.get("SELECT * FROM books WHERE id = ?", [itemId], (err, item) => {
        if (err || !item) {
            console.error("数据库查询错误:", err);
            return res.status(500).send("数据库错误");
        }
        // 传递 item 和 user 到视图
        res.render('item_detail', { item: item, user: req.session.user });
    });
});


// 更新书本状态为“已流转”
app.post('/update-status/:id', (req, res) => {
    const bookId = req.params.id;
    db.run(`UPDATE books SET status = '已流转' WHERE id = ?`, [bookId], function(err) {
        if (err) {
            console.error("数据库更新错误:", err);
            return res.status(500).send("数据库错误");
        }
        res.redirect(`/my-books`); // 重定向回我的书本页面
    });
});

// 删除书本
app.post('/delete/:id', (req, res) => {
    const bookId = req.params.id;
    db.run("DELETE FROM books WHERE id = ?", [bookId], function(err) {
        if (err) {
            return res.status(500).send("数据库错误");
        }
        res.redirect('/my-books');
    });
});


// 下架物品 -> 更新状态为 "已成交"
app.post('/shelve/:id', (req, res) => {
    const bookId = req.params.id;
    db.run(`UPDATE books SET status = '已成交' WHERE id = ?`, [bookId], function(err) {
        if (err) {
            console.error("数据库更新错误:", err);
            return res.status(500).send("数据库错误");
        }
        res.redirect(`/my-books`); // 重定向回我的物品页面
    });
});



// 重新上架物品 -> 更新状态为 "可用"
app.post('/unshelve/:id', (req, res) => {
    const bookId = req.params.id;
    db.run(`UPDATE books SET status = '可用' WHERE id = ?`, [bookId], function(err) {
        if (err) {
            console.error("数据库更新错误:", err);
            return res.status(500).send("数据库错误");
        }
        res.redirect(`/my-books`); // 重定向回我的物品页面
    });
});



// 更新书本状态为“已预订”
app.post('/contact/:id', (req, res) => {
    const bookId = req.params.id;
    db.run(`UPDATE books SET status = '已预订' WHERE id = ?`, [bookId], function(err) {
        if (err) {
            console.error("数据库更新错误:", err);
            return res.status(500).send("数据库错误");
        }
        res.redirect(`/item/${bookId}`); // 重定向回物品详情页
    });
});


// 我的物品页面
app.get('/my-books', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const userId = req.session.user.id; // 假设用户 ID 存储在 session 中
    db.all("SELECT * FROM books WHERE user_id = ?", [userId], (err, items) => {
        if (err) {
            console.error("数据库查询错误:", err); // 输出详细错误信息
            return res.status(500).send("数据库错误");
        }
        // 确保将 items 和 user 传递给视图
        res.render('my_books', { items: items, user: req.session.user });
    });
});


// 转让书本页面
app.get('/transfer', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    // 将 user 变量传递给视图
    res.render('transfer_book', { user: req.session.user });
});

// 登录页面
app.get('/login', (req, res) => {
    // 将 user 变量传递给视图
    res.render('login', { user: req.session.user });
});


// 注册页面
app.get('/register', (req, res) => {
    // 将 user 变量传递给视图
    res.render('register', { user: req.session.user });
});

// 转让物品
app.post('/transfer', upload.single('image'), (req, res) => {
    const { category, name, condition, grade, class_info, contact, contact_name, message } = req.body;
    const image = req.file ? '/uploads/' + req.file.filename : null;
    const userId = req.session.user.id;

    db.run(`INSERT INTO books (category, name, condition, grade, class_info, contact, contact_name, message, image, user_id, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [category, name, condition, grade, class_info, contact, contact_name, message, image, userId, '可用'], // 默认状态为“可用”
        function(err) {
            if (err) {
                console.error("数据库插入错误:", err);
                return res.status(500).send("数据库错误");
            }
            res.redirect('/');
        });
});

// 登录路由
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user) {
            return res.status(400).send("用户名或密码错误");
        }

        // 使用 bcrypt.compare 比较用户输入的密码和数据库中存储的哈希密码
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err || !isMatch) {
                return res.status(400).send("用户名或密码错误");
            }
            req.session.user = user; // 登录成功后，将用户信息存储到 session
            res.redirect('/'); // 登录成功后重定向到首页
        });
    });
});



// 清空用户表数据（仅在开发时使用）
app.get('/clear-users', (req, res) => {
    db.run("DELETE FROM users", function(err) {
        if (err) {
            return res.status(500).send("数据库清空失败");
        }
        res.send('所有用户已删除');
    });
});

// 清空所有物品数据（仅在开发时使用）
app.get('/clear-all', (req, res) => {
    db.run("DELETE FROM books", function(err) {
        if (err) {
            return res.status(500).send("数据库清空失败");
        }
        res.send('所有物品已删除');
    });
});


app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send("登出失败");
        }
        res.redirect('/'); // 登出后重定向到首页
    });
});

// 注册路由
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // 检查用户名是否已存在
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, existingUser) => {
        if (existingUser) {
            return res.status(400).send("用户名已存在");
        }

        // 使用 bcrypt 对密码进行加密
        const hashedPassword = bcrypt.hashSync(password, 10); // 使用 bcrypt 加密密码

        db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword], function(err) {
            if (err) {
                return res.status(500).send("注册失败");
            }
            req.session.user = { id: this.lastID, username }; // 将用户信息存储到 session 中
            res.redirect('/'); // 注册成功后重定向到首页
        });
    });
});


// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器正在运行在端口 ${PORT}`);
});
