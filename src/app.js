const http = require("http");
const fs = require("fs");
const url = require("url");
const puppeteer = require("puppeteer");

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

const server = http.createServer(async function (req, res) {
  const path = url.parse(req.url).pathname;
  if (path === "/index.css") {
    renderFile(__dirname + "/index.css", "text/css", res);
  } else if (path === "/index.js") {
    renderFile(__dirname + "/index.js", "text/html", res);
  } else if (path === "/read-users") {
    const usersFilePath = __dirname.split("src")[0] + "data/voting_users.txt";
    const signedUsersFilePath =
      __dirname.split("src")[0] + "data/already_signedup.txt";
    const votedUsersFilePath =
      __dirname.split("src")[0] + "data/already_voted.txt";

    fs.readFile(usersFilePath, function (error, data) {
      if (error) {
        res.writeHead(404);
        res.write(error);
        res.end();
      } else {
        const usersText = data.toString().split("\n");
        var users = [];
        usersText.forEach((user) => {
          user = user.split(", ");
          users.push({
            email: user[0],
            name: user[1],
            password: user[2],
          });
        });

        fs.readFile(signedUsersFilePath, function (error, data) {
          if (error) {
            res.writeHead(404);
            res.write(error);
            res.end();
          } else {
            const signedUserEmails = data.toString().split("\n");
            var processedUsers = users.map((user) => {
              if (signedUserEmails.includes(user.email)) {
                user.signedUp = true;
              }
              return user;
            });

            fs.readFile(votedUsersFilePath, function (error, data) {
              if (error) {
                res.writeHead(404);
                res.write(error);
                res.end();
              } else {
                const voteUserEmails = data.toString().split("\n");
                processedUsers = processedUsers.filter(
                  (user) => !voteUserEmails.includes(user.email)
                );
                res.write(JSON.stringify(processedUsers));
                res.end();
              }
            });
          }
        });
      }
    });

    // renderFile(filePath, "text/plain", res);
  } else if (path === "/run-automation") {
    req.on("data", async function (data) {
      const users = JSON.parse(data.toString());

      for (let user of users) {
        const browser = await puppeteer.launch({
          headless: false,
          defaultViewport: null,
          args: ["--start-maximized"],
        });
        const page = await browser.newPage();

        // go to content creator page
        await page.goto(
          "https://creatordao.com/thesearch/profile/adam-elmasri"
        );

        // click vote button
        await page.goto(
          "https://creatordao.com/thesearch/profile/adam-elmasri"
        );
        const voteButtonSelector = "#recaptcha-btn";
        await page.waitForSelector(voteButtonSelector, { visible: true });
        await page.click(voteButtonSelector);

        if (user.signedUp) {
          // login
          const loginButtonSelector = ".flex.justify-center.items-center";
          await page.waitForSelector(loginButtonSelector, { visible: true });
          await page.click(loginButtonSelector);
        }

        const emailSelector = "input[data-testid='email']";
        await page.waitForSelector(emailSelector, { visible: true });
        await page.type(emailSelector, user.email, { delay: 100 });

        const submitButton = "button[data-testid='login-button']";
        await page.waitForSelector(submitButton);
        await page.click(submitButton);

        if (!user.signedUp) {
          const displayNameSelector = "input[name='display_name']";
          await page.waitForSelector(displayNameSelector, { visible: true });
          await page.type(displayNameSelector, user.name, { delay: 100 });
        }

        const passwordSelector = "input[name='password']";
        await page.waitForSelector(passwordSelector, { visible: true });
        await page.type(passwordSelector, user.password, { delay: 100 });

        await page.waitForSelector(submitButton);
        await page.click(submitButton);

        await new Promise((r) => setTimeout(r, 10000));

        if (!user.signedUp) {
          const displayNameSelector = "input[name='display_name']";
          await page.waitForSelector(displayNameSelector, { visible: true });
          await page.type(displayNameSelector, user.name, { delay: 100 });

          await page.waitForSelector(submitButton);
          await page.click(submitButton);

          fs.appendFileSync(
            __dirname.split("src")[0] + "data/already_signedup.txt",
            `${user.email}\n`
          );
          user.signedUp = true;
        }

        // vote button click
        await page.waitForSelector(voteButtonSelector, { visible: true });
        await page.click(voteButtonSelector);

        // add in already voted list
        fs.appendFileSync(
          __dirname.split("src")[0] + "data/already_voted.txt",
          `${user.email}\n`
        );

        // wait 2 minutes --> 2 x 60 x 1000 = 120,000
        await new Promise((r) => setTimeout(r, 120000));
      }
    });
  } else {
    renderFile(__dirname + "/index.html", "text/html", res);
  }
});

server.listen(3030, function () {
  console.log("Application running on localhost:3030");
});
