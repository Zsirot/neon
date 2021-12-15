let arr = [];
for (let variant of product.variants) {
    arr.push(variant.color)
}
let uniqueColors = [];
arr.forEach((c) => {
    if (!uniqueColors.includes(c)) {
        uniqueColors.push(c);
    }
});
console.log(uniqueColors)