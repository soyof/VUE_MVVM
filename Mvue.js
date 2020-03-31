const compileUtil = {
  getVal(expr, vm) { // 获取div v-text="person.name"></div> 中的person.name这个属性--使得可以在$data顺利取得此值
    return expr.split('.').reduce((data, currentVal) => {
      currentVal = currentVal.trim()
      return data[currentVal];
    }, vm.$data)
  },

  setVal(expr, vm, inputVal) {
    return expr.split('.').reduce((data, currentVal) => {
      currentVal = currentVal.trim()
      data[currentVal] = inputVal
    }, vm.$data)
  },

  getContentVal(expr, vm) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getVal(args[1], vm)
    })
  },

  text(node, expr, vm) { // expr---msg
    let value;
    if (expr.indexOf('{{') !== -1) {
      value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
        // 绑定观察者,数据发生变化时触发 进行更新
        new Watcher(vm, args[1], () => {
          this.updater.textUpdater(node, this.getContentVal(expr, vm))
        })
        return this.getVal(args[1], vm)
      })
    } else {
      value = this.getVal(expr, vm)
      new Watcher(vm, expr, (newVal) => {
        this.updater.textUpdater(node, newVal)
      })
    }
    this.updater.textUpdater(node, value)
  },

  html(node, expr, vm) {
    const value = this.getVal(expr, vm)
    new Watcher(vm, expr, (newVal) => {
      this.updater.htmlUpdater(node, newVal)
    })
    this.updater.htmlUpdater(node, value)
  },

  model(node, expr, vm) {
    const value = this.getVal(expr, vm)
    // 绑定更新函数 数据=> 视图
    new Watcher(vm, expr, (newVal) => {
      this.updater.modelUpdater(node, newVal)
    })
    // 视图 => 数据 => 视图
    node.addEventListener('input', (e) => {
      this.setVal(expr, vm, e.target.value)
    })
    this.updater.modelUpdater(node, value)
  },

  on(node, expr, vm, eventName) {
    let fn = vm.$options.methods && vm.$options.methods[expr]
    node.addEventListener(eventName, fn.bind(vm), false)
  },

  bind(node, expr, vm, attr) {},

  // 更新的函数
  updater: {
    textUpdater(node, value) {
      node.textContent = value
    },

    htmlUpdater(node, value) {
      node.innerHTML = value
    },

    modelUpdater(node, value) {
      node.value = value
    }
  }
}

class Compile{

  constructor(el, vm) {
    this.el = this.isElementNode(el) ? el : document.querySelector(el)
    this.vm = vm
    // 获取文档碎片对象, 放入内存减少回流重绘
    const fragment = this.nodeFragment(this.el)
    // 编译模版
    this.compile(fragment)
    // 追加子元素到根元素
    this.el.appendChild(fragment)
  }

  compile(fragment) {
    // 获取子节点
    const childNodes = fragment.childNodes;
    [...childNodes].forEach(child => {
      if (this.isElementNode(child)) {
        this.compileElement(child)
      } else {
        this.compileText(child)
      }
      if (child.childNodes && child.childNodes.length) {
        this.compile(child)
      }
    })
  }

  compileElement(node) {
    const attributes = node.attributes
    ;[...attributes].forEach(attr => {
      const { name, value } = attr
      if (this.isDirective(name)) { // 获取到指令v-html v-text等
        const [,dirctive] = name.split('-') // text, html, model on:click等
        const [dirName, eventName] = dirctive.split(':') // text html model on
        // 更新数据, 数据驱动视图
        compileUtil[dirName](node, value, this.vm, eventName)
        // 删除有指令的标签上的属性
        node.removeAttribute('v-' + dirctive)
      } else if(this.isEventName(name)) {
        let [,eventName] = name.split('@')
        compileUtil['on'](node, value, this.vm, eventName)
      }
    })
  }

  compileText(node) {
    const content = node.textContent
    if (/\{\{(.+?)\}\}/.test(content)) {
      compileUtil['text'](node, content, this.vm)
    }
  }

  isEventName(attrName) {
    return attrName.startsWith('@')
  }

  nodeFragment(el) {
    // 创建文档碎片
    const f = document.createDocumentFragment()
    let firstChild;
    while (firstChild = el.firstChild) {
      f.appendChild(firstChild)
    }
    return f
  }

  isDirective(attrName) {
    return attrName.startsWith('v-')
  }

  isElementNode(node) {
    return node.nodeType === 1
  }

}

class Vue{
  constructor(options) {
    this.$el = options.el
    this.$data = options.data
    this.$options = options
    if (this.$el) {
      // 数据观察者
      new Observer(this.$data)
      // 指令解析器
      new Compile(this.$el, this)
      this.proxyData(this.$data)
    }
  }

  proxyData(data) {
    for (const key in data) {
      Object.defineProperty(this, key, {
        get() {
          return data[key]
        },
        set(newVal) {
          data[key] = newVal
        }
      })
    }
  }
}
