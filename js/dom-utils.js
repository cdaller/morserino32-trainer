function createSpanElement(value, clasz) {
    return createElement(value, 'span', clasz);
}

function createElement(value, tag, classes) {
    let element = document.createElement(tag);
    if (classes) {
        classes.split(' ').forEach(clasz => {
            element.classList.add(clasz);    
        });
    }
    element.innerHTML = value;
    return element;
}

function createElementWithChildren(tag, ...children) {
    let element = document.createElement(tag);
    element.replaceChildren(...children);
    return element;
}

module.exports = { createSpanElement, createElement, createElementWithChildren}