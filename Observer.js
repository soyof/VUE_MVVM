class Watcher{
  constructor(vm, expr, cb) {
    this.vm = vm
    this.expr = expr
    this.cb = cb
    this.oldVal = this.getOldVal()
  }

  getOldVal() {
    Dep.target = this // 将watcher挂在到dep上
    const oldVal = compileUtil.getVal(this.expr, this.vm)
    Dep.target = null // 获取到值后清除所挂载的watcher
    return oldVal
  }

  update() {
    const newVal = compileUtil.getVal(this.expr, this.vm)
    if (newVal !== this.oldVal) {
      this.cb(newVal)
    }
  }
}


class Dep{
  constructor() {
    this.sub = []
  }
  // 收集观察者
  addSub(watcher) {
    this.sub.push(watcher)
  }
  // 通知观察者更新
  notify() {
    this.sub.forEach(w => w.update())
  }
}


class Observer{
  constructor(data) {
    this.observer(data)
  }

  observer(data) {
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(key => {
        this.defineReactive(data, key, data[key])
      })
    }
  }

  defineReactive(obj, key, value) {
    // 递归遍历
    this.observer(value)
    const dep = new Dep()
    // 劫持并监听所有属性
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: false,
      get() {
        // 订阅数据变化时,往Dep中添加观察者
        Dep.target && dep.addSub(Dep.target)
        return value
      },
      set: newVal => {
        this.observer(value) // 如果设置新值时需重新劫持新值,确保不会因为改变值而导致未能劫持数据
        if (newVal !== value) {
          value = newVal
        }
        // 通知变化
        dep.notify()
      }
    })
  }

}
