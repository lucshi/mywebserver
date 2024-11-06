const express = require('express');
const app = express();
const port = 3000;

// 设置主页内容，包含点阵画和欢迎文字
app.get('/', (req, res) => {
  const dotMatrixArt = `
   ***************
   *             *
   *   Welcome   *
   *             *
   ***************
  `;

  const htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome</title>
      <style>
          body {
              font-family: monospace;
              background-color: #282c34;
              color: white;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
          }
          .container {
              text-align: center;
              animation: fadeIn 3s ease-in-out;
          }
          .dot-matrix {
              white-space: pre;
              font-size: 16px;
              margin-bottom: 20px;
          }
          @keyframes fadeIn {
              0% { opacity: 0; }
              100% { opacity: 1; }
          }
          .welcome-text {
              font-size: 30px;
              animation: colorChange 5s infinite alternate;
          }
          @keyframes colorChange {
              0% { color: #61dafb; }
              100% { color: yellow; }
          }
          .blinking-cursor {
              font-weight: bold;
              font-size: 30px;
              color: #61dafb;
              animation: blink 1s step-end infinite;
          }
          @keyframes blink {
              from, to { color: transparent; }
              50% { color: #61dafb; }
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="dot-matrix">${dotMatrixArt}</div>
          <div class="welcome-text">校园二手交易网站</div>
          <div class="blinking-cursor">建站中...</div>
      </div>
  </body>
  </html>
  `;

  res.send(htmlContent);
});

// 启动服务器
app.listen(port, () => {
  console.log(`Web server is running at http://localhost:${port}`);
});

