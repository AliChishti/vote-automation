(function () {
  fetch("/read-users")
    .then((res) => res.text())
    .then((res) => {
        const usersText = res.split("\n");
        const users = [];
        usersText.forEach(user => {
            user = user.split(", ");
            users.push({
                email: user[0],
                name: user[1],
                password: user[2]
            })
        })
        const userTable = document.getElementById("user-table");
    });
})();
