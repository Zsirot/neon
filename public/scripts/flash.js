//Makes flash messages (errors, successes) close after 3 seconds
const flashBtns = document.querySelectorAll('.success-flash button')
for (let flashBtn of flashBtns) {
    setTimeout(() => { flashBtn.click() }, 3000);
}
