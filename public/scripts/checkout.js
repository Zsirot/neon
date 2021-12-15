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

//Hides default form submit and uses JS to activate that hidden button from another button outisde the form. Workaround for lack of formatting flexibility from button inside the form
const checkoutForm = document.querySelector('.checkout-form')
const hiddenCheckout = document.querySelector('.hidden-checkout')
const shownCheckout = document.querySelector('.shown-checkout')

shownCheckout.addEventListener('click', function () {
    hiddenCheckout.click()
})

