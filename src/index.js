(function () {
  fetch("/read-users")
    .then((res) => res.text())
    .then((res) => {
      localStorage.setItem("users", res);
      const userTable = document.getElementById("user-table");
      JSON.parse(res).forEach((user) => {
        const tr = document.createElement("tr");

        const td = document.createElement("td");
        td.innerText = user.email;

        tr.appendChild(td);

        userTable.appendChild(tr);
      });
    });
})();

function runAutomation() {
  const users = localStorage.getItem("users");
  fetch("/run-automation", {
    method: "POST",
    body: users,
    headers: {
      "content-type": "application/json",
    },
  });
}
