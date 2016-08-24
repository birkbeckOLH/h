'use strict';

var domUtil = require('../../util/dom');

describe('util/dom', function () {
  function createDOM(html) {
    var el = document.createElement('div');
    el.innerHTML = html;
    var child = el.children[0];
    document.body.appendChild(child);
    el.remove();
    return child;
  }

  describe('setElementState', function () {
    it('adds "is-$state" classes for keys with truthy values', function () {
      var btn = createDOM('<button></button>');
      domUtil.setElementState(btn, {
        visible: true,
      });
      assert.deepEqual(Array.from(btn.classList), ['is-visible']);
    });

    it('removes "is-$state" classes for keys with falsey values', function () {
      var btn = createDOM('<button class="is-hidden"></button>');
      domUtil.setElementState(btn, {
        hidden: false,
      });
      assert.deepEqual(Array.from(btn.classList), []);
    });
  });

  describe('replaceElement', function () {
    it('replaces the DOM element', function () {
      var container = createDOM('<div><button></button></div>');
      var btn = domUtil.replaceElement(container.querySelector('button'),
        '<button class="updated"></button>');
      assert.equal(btn.outerHTML, '<button class="updated"></button>');
    });

    it('throws if the element does not have a parent', function () {
      var el = document.createElement('div');
      assert.throws(function () {
        domUtil.replaceElement(el, '<div></div>');
      });
    });
  });

  describe('jsElements', function () {
    it('finds elements with "js-" classes', function () {
      var container = createDOM('<div class="js-root"></div>');
      assert.deepEqual(domUtil.jsElements(container), {
        root: container,
      });
    });

    it('finds child elements with "js-" classes', function () {
      var container = createDOM('<div><button class="js-btn"></button></div>');
      assert.deepEqual(domUtil.jsElements(container), {
        btn: container.querySelector('button'),
      });
    });

    it('finds multiple elements with the same "js-" class', function () {
      var container = createDOM('<div><div class="js-child"></div>' +
                                '<div class="js-child"></div></div>');
      assert.deepEqual(domUtil.jsElements(container), {
        child: Array.from(container.querySelectorAll('.js-child')),
      });
    });
  });
});
