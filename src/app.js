const http = require("http");
const fs = require("fs");
const url = require("url");

function renderFile(filePath, fileType, res) {
  fs.readFile(filePath, function (error, data) {
    if (error) {
      res.writeHead(404);
      res.write(error);
      res.end();
    } else {
      res.writeHead(200, {
        "Content-Type": fileType,
      });
      res.write(data);
      res.end();
    }
  });
}

const server = http.createServer(function (req, res) {
  const path = url.parse(req.url).pathname;
  if (path === "/index.css") {
    renderFile(__dirname + "/index.css", "text/css", res);
  } else if (path === "/index.js") {
    renderFile(__dirname + "/index.js", "text/html", res);
  } else if (path === "/read-users") {
    const filePath = __dirname.split("src")[0] + "data/voting_users.txt";
    renderFile(filePath, "text/plain", res);
  } else {
    renderFile(__dirname + "/index.html", "text/html", res);
  }
});

server.listen(3030, function () {
  console.log("Application running on localhost:3030");
});
