//Makes fixed navbar transparent depending on nav location, animates overlay at the same time
const overlay = document.querySelector('.image-overlay');
const nav = document.querySelector('.bg-transparent');
window.addEventListener('scroll', checkBoxes); //on scroll, check window position
checkBoxes()
function checkBoxes() {
    const triggerBottom = 1;
    const navTop = nav.getBoundingClientRect().top;
    if (navTop < triggerBottom) {
        nav.classList.add('animate')
        overlay.classList.add('animate')
    } else {
        nav.classList.remove('animate')
        overlay.classList.remove('animate')
    }
}