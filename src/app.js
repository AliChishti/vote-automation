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

      // selectors required for automation
      const voteButtonSelector = "#recaptcha-btn";
      const loginButtonSelector = ".flex.justify-center.items-center";
      const emailSelector = "input[data-testid='email']";
      const submitButton = "button[data-testid='login-button']";
      const displayNameSelector = "input[name='display_name']";
      const passwordSelector = "input[name='password']";

      // loop over all users
      for (let user of users) {
        try {
          // open a new browser session
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

          // click on vote button -> will be redirected to signup
          await page.waitForSelector(voteButtonSelector, { visible: true });
          await page.click(voteButtonSelector);
          
          // in case the user has signed up already, then press the login button
          if (user.signedUp) {
            await page.waitForSelector(loginButtonSelector, { visible: true });
            await page.click(loginButtonSelector);
          }

          // fill email
          await page.waitForSelector(emailSelector, { visible: true });
          await page.type(emailSelector, user.email, { delay: 100 });

          // press submit to go to next screen
          await page.waitForSelector(submitButton);
          await page.click(submitButton);

          // if signing up, will need to fill display name field
          if (!user.signedUp) {
            await page.waitForSelector(displayNameSelector, { visible: true });
            await page.type(displayNameSelector, user.name, { delay: 100 });
          }

          // fill password
          await page.waitForSelector(passwordSelector, { visible: true });
          await page.type(passwordSelector, user.password, { delay: 100 });

          // press submit 
          await page.waitForSelector(submitButton);
          await page.click(submitButton);

          // wait for 10 seconds in case the display name is needed again
          await new Promise((r) => setTimeout(r, 10000));

          // in case of signup, two possibilities now:
          // 1. enter display name again
          // 2. directed to vote page
          if (!user.signedUp) {
            try {
              await page.waitForSelector(displayNameSelector, {
                visible: true,
              });
              await page.type(displayNameSelector, user.name, { delay: 100 });

              await page.waitForSelector(submitButton);
              await page.click(submitButton);
            } catch (error) {
              // do nothing: display name not needed again
            }

            // user has signed up successfully
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
          
          // change this value to change intervals between user sessions
          await new Promise((r) => setTimeout(r, 10000));

          browser.close();
        } catch (error) {
          // in case an iteration messed up, log that user's email and continue with the rest
          console.log(user.email);
        }
      }
    });
  } else {
    renderFile(__dirname + "/index.html", "text/html", res);
  }
});

server.listen(3030, function () {
  console.log("Application running on localhost:3030");
});
