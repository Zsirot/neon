//Reloads last page position after refresh or item update
let lastTop = sessionStorage.getItem("sidebar-scroll");
var scrollOptions = {
    left: 0,
    top: lastTop,
    behavior: 'auto'
}

if (lastTop !== null) {
    window.scroll(scrollOptions)
}

let scrollPosition = null
window.addEventListener('beforeunload', () => {
    scrollPosition = document.documentElement.scrollTop //on submit, define scroll position as current
    sessionStorage.setItem("sidebar-scroll", scrollPosition); ///place that postion in the localstorage

})


//Toggles offcanvas cart UI via cart circle  element
const cartCircle = document.querySelector('.cart-circle')
const countCircle = document.querySelector('.cart-count-circle')
const toggleCircle = function () { //transforms circle color and translate-x
    cartCircle.classList.toggle('active');
    countCircle.classList.toggle('active');
}
const offCanvas = document.querySelector('.offcanvas');
const config = { attributes: true, attributeFilter: ['class'] }; //observer config, set to observe the attribute 'class' for changes
const canvasObserver = new MutationObserver(circleCallback); // sets behavior after mutation is observed, as the specified callback

function circleCallback(mutations) { //for each class change mutation, toggleCircle()
    for (let mutation of mutations) {
        if (mutation.type === 'attributes') {
            toggleCircle();
        }
    }
}
canvasObserver.observe(offCanvas, config); //detects when the offcanvas class has been mutated(this typically happens when something outside the offcanvas is clicked), then toggles the cart circle transform


//Hides checkout/cart UI when screen size toggles the navbar to a dropdown. Prevents those items from moving to the dropdown (workaround for bootstrap nav settings)
const navbarToggler = document.querySelector('.navbar-toggler')
const checkoutContainer = document.querySelector('.checkout-container')
navbarToggler.addEventListener('click', function () {
    checkoutContainer.classList.toggle('active')
})



